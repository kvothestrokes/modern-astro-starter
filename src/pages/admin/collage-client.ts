/**
 * Cliente del módulo collage: entrada de imágenes, preview en canvas,
 * zoom/pan por celda, drag & drop para intercambio, B/N y exportación JPG.
 */

import {
  getState,
  addImages,
  removeImage,
  updateImageTransform,
  swapImages,
  setGrayscale,
  canShowCollage,
  subscribe
} from '../../lib/collage/state';
import { getLayoutForCount } from '../../lib/collage/layouts';
import { drawCollageToContext, getCellAtPosition, getCellBounds } from '../../lib/collage/render';
import { exportCollageToJpeg, loadImage } from '../../lib/collage/canvasExport';
import { MIN_IMAGES, MAX_IMAGES, MAX_EXPORT_SIZE } from '../../lib/collage/types';

const SELECTORS = {
  fileInput: '#collageFileInput',
  urlInput: '#collageUrlInput',
  addByUrlBtn: '#collageAddUrlBtn',
  thumbnailsList: '#collageThumbnails',
  collageContainer: '#collageContainer',
  collageCanvas: '#collageCanvas',
  grayscaleToggle: '#collageGrayscale',
  panModeCheckbox: '#collagePanMode',
  exportBtn: '#collageExportBtn',
  resolutionSelect: '#collageResolution',
  messageEl: '#collageMessage'
} as const;

function isPanModeActive(): boolean {
  return (document.querySelector(SELECTORS.panModeCheckbox) as HTMLInputElement)?.checked === true;
}

/** Cache de imágenes cargadas por URL para no recargar en cada redraw */
const imageCache = new Map<string, HTMLImageElement>();

/** Convierte File a data URL */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('No se pudo leer el archivo'));
    r.readAsDataURL(file);
  });
}

/** Muestra mensaje breve en #collageMessage */
function showMessage(text: string, isError = false) {
  const el = document.querySelector<HTMLElement>(SELECTORS.messageEl);
  if (!el) return;
  el.textContent = text;
  el.className = isError ? 'text-red-600 text-sm mt-1' : 'text-zinc-600 text-sm mt-1';
}

/** Devuelve coordenadas (x, y) en espacio del canvas a partir de un evento de puntero */
function getCanvasCoords(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function initImageInput() {
  const fileInput = document.querySelector<HTMLInputElement>(SELECTORS.fileInput);
  const urlInput = document.querySelector<HTMLInputElement>(SELECTORS.urlInput);
  const addUrlBtn = document.querySelector<HTMLButtonElement>(SELECTORS.addByUrlBtn);
  const thumbnailsList = document.querySelector<HTMLElement>(SELECTORS.thumbnailsList);

  if (!thumbnailsList) return;

  fileInput?.addEventListener('change', async () => {
    const files = Array.from(fileInput.files ?? []);
    if (files.length === 0) return;
    const current = getState().images.length;
    if (current + files.length > MAX_IMAGES) {
      showMessage(`Máximo ${MAX_IMAGES} imágenes. Añadiendo solo ${MAX_IMAGES - current}.`, true);
    }
    try {
      const urls = await Promise.all(files.map((f) => fileToDataUrl(f)));
      const added = addImages(urls);
      showMessage(added.length ? `${added.length} imagen(es) añadida(s).` : 'No se pudieron añadir más.');
      renderThumbnails();
      renderCollage();
    } catch (e) {
      showMessage('Error al leer archivos.', true);
    }
    fileInput.value = '';
  });

  addUrlBtn?.addEventListener('click', () => {
    const url = urlInput?.value?.trim();
    if (!url) {
      showMessage('Escribe una URL de imagen.', true);
      return;
    }
    if (getState().images.length >= MAX_IMAGES) {
      showMessage(`Máximo ${MAX_IMAGES} imágenes.`, true);
      return;
    }
    addImages([url]);
    renderThumbnails();
    renderCollage();
    urlInput.value = '';
    showMessage('URL añadida.');
  });
}

function renderThumbnails() {
  const list = document.querySelector<HTMLElement>(SELECTORS.thumbnailsList);
  if (!list) return;
  const { images } = getState();
  list.innerHTML = '';
  images.forEach((img) => {
    const wrap = document.createElement('div');
    wrap.className = 'relative inline-block rounded border border-zinc-200 overflow-hidden';
    const thumb = document.createElement('img');
    thumb.src = img.url;
    thumb.alt = '';
    thumb.className = 'h-14 w-14 object-cover block';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl';
    btn.textContent = '×';
    btn.title = 'Quitar';
    btn.addEventListener('click', () => {
      removeImage(img.id);
      renderThumbnails();
      renderCollage();
    });
    wrap.appendChild(thumb);
    wrap.appendChild(btn);
    list.appendChild(wrap);
  });
  if (images.length > 0 && (images.length < MIN_IMAGES || images.length > MAX_IMAGES)) {
    showMessage(`Necesitas entre ${MIN_IMAGES} y ${MAX_IMAGES} imágenes para el collage.`, images.length > MAX_IMAGES);
  }
}

/** Carga imágenes y las cachea; devuelve array en el mismo orden que state.images */
async function loadImagesForPreview(urls: string[]): Promise<HTMLImageElement[]> {
  const result: HTMLImageElement[] = [];
  for (const url of urls) {
    let img = imageCache.get(url);
    if (!img) {
      img = await loadImage(url);
      imageCache.set(url, img);
    }
    result.push(img);
  }
  return result;
}

/** Redibuja el canvas con el estado actual */
async function drawPreview() {
  const canvas = document.querySelector<HTMLCanvasElement>(SELECTORS.collageCanvas);
  const container = document.querySelector<HTMLElement>(SELECTORS.collageContainer);
  if (!canvas || !container) return;

  const { images, grayscale } = getState();
  if (!canShowCollage()) return;

  const containerEl = canvas.parentElement;
  if (!containerEl) return;
  const w = containerEl.clientWidth;
  const h = containerEl.clientHeight;
  if (w <= 0 || h <= 0) return;

  const size = Math.min(w, h);
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }

  const loadedImages = await loadImagesForPreview(images.map((i) => i.url));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  drawCollageToContext(ctx, {
    size,
    images: images.map((img) => ({
      scale: img.scale,
      translateX: img.translateX ?? 0,
      translateY: img.translateY ?? 0
    })),
    loadedImages,
    grayscale
  });
}

function renderCollage() {
  const container = document.querySelector<HTMLElement>(SELECTORS.collageContainer);
  const canvas = document.querySelector<HTMLCanvasElement>(SELECTORS.collageCanvas);
  const grayscaleToggle = document.querySelector<HTMLInputElement>(SELECTORS.grayscaleToggle);
  const exportBtn = document.querySelector<HTMLButtonElement>(SELECTORS.exportBtn);

  if (!container || !canvas) return;

  const { images, grayscale } = getState();

  if (!canShowCollage()) {
    container.classList.add('hidden');
    if (exportBtn) exportBtn.disabled = true;
    return;
  }
  container.classList.remove('hidden');
  if (exportBtn) exportBtn.disabled = false;

  container.classList.toggle('grayscale', grayscale);
  if (grayscaleToggle) grayscaleToggle.checked = grayscale;

  drawPreview();
}

function setupResizeAndSubscribe() {
  const canvas = document.querySelector<HTMLCanvasElement>(SELECTORS.collageCanvas);
  if (!canvas) return;
  const containerEl = canvas.parentElement;
  if (!containerEl) return;

  const resizeObserver = new ResizeObserver(() => {
    if (canShowCollage()) drawPreview();
  });
  resizeObserver.observe(containerEl);

  subscribe(() => {
    if (canShowCollage()) drawPreview();
  });
}

/** Tamaño actual del canvas (para hit testing) */
function getCanvasSize(): number {
  const canvas = document.querySelector<HTMLCanvasElement>(SELECTORS.collageCanvas);
  if (!canvas || canvas.width !== canvas.height) return 0;
  return canvas.width;
}

function setupCanvasEvents() {
  const canvas = document.querySelector<HTMLCanvasElement>(SELECTORS.collageCanvas);
  if (!canvas) return;

  let isPanning = false;
  let panImageId: string | null = null;
  let startCanvasX = 0;
  let startCanvasY = 0;
  let startTx = 0;
  let startTy = 0;

  let isDragging = false;
  let dragStartIndex: number | null = null;
  let dragOverIndex: number | null = null;

  const getSize = () => getCanvasSize();
  const getLayout = () => getLayoutForCount(getState().images.length);

  const redraw = () => drawPreview();

  canvas.addEventListener('wheel', (e) => {
    if (!canShowCollage()) return;
    e.preventDefault();
    const size = getSize();
    if (size <= 0) return;
    const { x, y } = getCanvasCoords(canvas, e);
    const layout = getLayout();
    const cellIndex = getCellAtPosition(x, y, layout, size);
    if (cellIndex < 0) return;
    const images = getState().images;
    const imgData = images[cellIndex];
    if (!imgData) return;
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const next = Math.max(0.2, Math.min(3, imgData.scale + delta));
    updateImageTransform(imgData.id, { scale: next });
    redraw();
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !canShowCollage()) return;
    const size = getSize();
    if (size <= 0) return;
    const { x, y } = getCanvasCoords(canvas, e);
    const layout = getLayout();
    const cellIndex = getCellAtPosition(x, y, layout, size);
    if (cellIndex < 0) return;

    const images = getState().images;
    const imgData = images[cellIndex];
    if (!imgData) return;

    const panMode = isPanModeActive() || e.ctrlKey;
    if (panMode) {
      e.preventDefault();
      isPanning = true;
      panImageId = imgData.id;
      const coords = getCanvasCoords(canvas, e);
      startCanvasX = coords.x;
      startCanvasY = coords.y;
      startTx = imgData.translateX ?? 0;
      startTy = imgData.translateY ?? 0;
      canvas.setPointerCapture(e.pointerId);
    } else {
      isDragging = true;
      dragStartIndex = cellIndex;
      dragOverIndex = cellIndex;
      canvas.setPointerCapture(e.pointerId);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (isPanning && panImageId) {
      const size = getSize();
      if (size <= 0) return;
      const layout = getLayout();
      const bounds = getCellBounds(layout, size);
      const cellIndex = getState().images.findIndex((i) => i.id === panImageId);
      if (cellIndex < 0 || !bounds[cellIndex]) return;
      const b = bounds[cellIndex];
      const { x: curX, y: curY } = getCanvasCoords(canvas, e);
      const dx = (curX - startCanvasX) / b.width;
      const dy = (curY - startCanvasY) / b.height;
      updateImageTransform(panImageId, { translateX: startTx + dx, translateY: startTy + dy });
      startCanvasX = curX;
      startCanvasY = curY;
      startTx = startTx + dx;
      startTy = startTy + dy;
      redraw();
    } else if (isDragging && dragStartIndex !== null) {
      const size = getSize();
      if (size <= 0) return;
      const { x, y } = getCanvasCoords(canvas, e);
      const layout = getLayout();
      const over = getCellAtPosition(x, y, layout, size);
      if (over !== dragOverIndex) {
        dragOverIndex = over;
        redraw();
      }
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (e.button !== 0) return;
    if (isPanning) {
      isPanning = false;
      panImageId = null;
      canvas.releasePointerCapture(e.pointerId);
    }
    if (isDragging) {
      if (dragStartIndex !== null && dragOverIndex >= 0 && dragStartIndex !== dragOverIndex) {
        swapImages(dragStartIndex, dragOverIndex);
      }
      isDragging = false;
      dragStartIndex = null;
      dragOverIndex = null;
      canvas.releasePointerCapture(e.pointerId);
      renderCollage();
    }
  });

  canvas.addEventListener('pointercancel', () => {
    isPanning = false;
    panImageId = null;
    isDragging = false;
    dragStartIndex = null;
    dragOverIndex = null;
  });

  canvas.style.cursor = isPanModeActive() ? 'grab' : '';
}

function initControls() {
  const grayscaleToggle = document.querySelector<HTMLInputElement>(SELECTORS.grayscaleToggle);
  const exportBtn = document.querySelector<HTMLButtonElement>(SELECTORS.exportBtn);
  const resolutionSelect = document.querySelector<HTMLSelectElement>(SELECTORS.resolutionSelect);

  grayscaleToggle?.addEventListener('change', () => {
    setGrayscale(grayscaleToggle.checked);
    const container = document.querySelector(SELECTORS.collageContainer);
    container?.classList.toggle('grayscale', grayscaleToggle.checked);
  });

  document.querySelector(SELECTORS.panModeCheckbox)?.addEventListener('change', () => {
    const canvas = document.querySelector<HTMLCanvasElement>(SELECTORS.collageCanvas);
    if (canvas) canvas.style.cursor = isPanModeActive() ? 'grab' : '';
  });

  exportBtn?.addEventListener('click', async () => {
    const size = resolutionSelect?.value ? Math.min(Number(resolutionSelect.value), MAX_EXPORT_SIZE) : MAX_EXPORT_SIZE;
    if (!canShowCollage()) {
      showMessage('Añade entre 6 y 12 imágenes para exportar.', true);
      return;
    }
    exportBtn.disabled = true;
    showMessage('Exportando...');
    try {
      const blob = await exportCollageToJpeg(getState(), {
        size,
        grayscale: getState().grayscale
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collage-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Descarga iniciada.');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : 'Error al exportar.', true);
    } finally {
      exportBtn.disabled = false;
    }
  });
}

function init() {
  initImageInput();
  initControls();
  renderThumbnails();
  renderCollage();
  setupCanvasEvents();
  setupResizeAndSubscribe();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
