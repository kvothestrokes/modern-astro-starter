/**
 * Renderizado del collage en canvas. Única fuente de verdad para preview y export.
 */

import type { LayoutSpec } from './types';
import { getLayoutForCount } from './layouts';

export interface CellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseFrTrack(track: string, totalSize: number): number[] {
  const parts = track.trim().split(/\s+/);
  const factors = parts.map((p) => {
    const m = p.match(/^([\d.]+)fr$/);
    return m ? Number(m[1]) : 1;
  });
  const sum = factors.reduce((a, b) => a + b, 0);
  const positions: number[] = [0];
  let acc = 0;
  for (let i = 0; i < factors.length; i++) {
    acc += factors[i];
    positions.push((acc / sum) * totalSize);
  }
  return positions;
}

function parseGridLine(line: string): { start: number; end: number } {
  const slash = line.indexOf('/');
  if (slash >= 0) {
    const start = parseInt(line.slice(0, slash).trim(), 10);
    const end = parseInt(line.slice(slash + 1).trim(), 10);
    return { start: Math.max(1, start), end: Math.max(1, end) };
  }
  const single = parseInt(line.trim(), 10) || 1;
  return { start: single, end: single + 1 };
}

/**
 * Devuelve los bounds en píxeles de cada celda del layout para un canvas de lado `size`.
 */
export function getCellBounds(layout: LayoutSpec, size: number): CellBounds[] {
  const colPositions = parseFrTrack(layout.gridTemplateColumns, size);
  const rowPositions = parseFrTrack(layout.gridTemplateRows, size);
  return layout.cells.map((cell) => {
    const col = parseGridLine(cell.gridColumn);
    const row = parseGridLine(cell.gridRow);
    return {
      x: colPositions[col.start - 1] ?? 0,
      y: rowPositions[row.start - 1] ?? 0,
      width: (colPositions[col.end - 1] ?? colPositions[colPositions.length - 1]) - (colPositions[col.start - 1] ?? 0),
      height: (rowPositions[row.end - 1] ?? rowPositions[rowPositions.length - 1]) - (rowPositions[row.start - 1] ?? 0)
    };
  });
}

/**
 * Índice de la celda que contiene el punto (x, y) en coordenadas del canvas, o -1.
 */
export function getCellAtPosition(
  x: number,
  y: number,
  layout: LayoutSpec,
  size: number
): number {
  const bounds = getCellBounds(layout, size);
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i];
    if (x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height) {
      return i;
    }
  }
  return -1;
}

export interface DrawCollageOptions {
  size: number;
  images: Array<{ scale: number; translateX: number; translateY: number }>;
  loadedImages: HTMLImageElement[];
  grayscale?: boolean;
}

/**
 * Dibuja el collage en el contexto 2D. Misma lógica para preview y export.
 */
export function drawCollageToContext(ctx: CanvasRenderingContext2D, opts: DrawCollageOptions): void {
  const { size, images, loadedImages, grayscale = false } = opts;
  if (images.length < 6 || images.length > 12) return;

  const layout = getLayoutForCount(images.length);
  const bounds = getCellBounds(layout, size);

  ctx.fillStyle = '#f4f4f5';
  ctx.fillRect(0, 0, size, size);

  if (grayscale) {
    ctx.filter = 'grayscale(100%)';
  }

  for (let i = 0; i < images.length && i < bounds.length; i++) {
    const imgEl = loadedImages[i];
    const imgData = images[i];
    const b = bounds[i];
    if (!imgEl || !b) continue;

    const scale = Math.max(0.1, imgData.scale);
    const tx = (imgData.translateX ?? 0) * b.width;
    const ty = (imgData.translateY ?? 0) * b.height;
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;

    const imgW = imgEl.naturalWidth;
    const imgH = imgEl.naturalHeight;
    const scaleToCover = Math.max(b.width / imgW, b.height / imgH) * scale;

    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.width, b.height);
    ctx.clip();
    ctx.translate(cx + tx, cy + ty);
    ctx.scale(scaleToCover, scaleToCover);
    ctx.drawImage(imgEl, -imgW / 2, -imgH / 2, imgW, imgH);
    ctx.restore();
  }

  ctx.filter = 'none';
}
