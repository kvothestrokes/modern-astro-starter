/**
 * Exportación del collage a JPG en cliente.
 * Usa drawCollageToContext como única fuente de verdad.
 */

import type { CollageState, ExportOptions } from './types';
import { DEFAULT_EXPORT_SIZE, MAX_EXPORT_SIZE } from './types';
import { drawCollageToContext } from './render';

/** Carga una imagen desde URL (data URL o object URL) */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = url;
  });
}

/**
 * Exporta el collage a JPG usando la misma lógica de dibujo que la vista previa.
 */
export async function exportCollageToJpeg(
  state: CollageState,
  options: Partial<ExportOptions> = {}
): Promise<Blob> {
  const size = Math.min(
    options.size ?? DEFAULT_EXPORT_SIZE,
    MAX_EXPORT_SIZE
  );
  const quality = Math.min(1, Math.max(0, options.quality ?? 0.92));
  const grayscale = options.grayscale ?? state.grayscale;

  const { images } = state;
  if (images.length < 6 || images.length > 12) {
    throw new Error('El collage debe tener entre 6 y 12 imágenes');
  }

  const loadedImages = await Promise.all(
    images.map((img) => loadImage(img.url))
  );

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');

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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Error al generar JPG'));
      },
      'image/jpeg',
      quality
    );
  });
}
