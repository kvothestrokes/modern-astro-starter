/**
 * Estado del collage: lista de imágenes y transform por celda.
 * Funciones para add/remove/update/reorder; notifica cambios vía callback.
 */

import type { CollageImage, CollageState } from './types';
import { MAX_IMAGES, MIN_IMAGES } from './types';

const DEFAULT_SCALE = 1;
const DEFAULT_TRANSLATE = 0;

/** Crea una imagen con valores por defecto */
export function createCollageImage(url: string, id?: string): CollageImage {
  return {
    id: id ?? crypto.randomUUID(),
    url,
    scale: DEFAULT_SCALE,
    translateX: DEFAULT_TRANSLATE,
    translateY: DEFAULT_TRANSLATE
  };
}

/** Estado actual del módulo (singleton para esta página) */
let state: CollageState = {
  images: [],
  grayscale: false
};

export type StateListener = (s: CollageState) => void;
const listeners: StateListener[] = [];

function notify() {
  listeners.forEach((fn) => fn(state));
}

export function getState(): CollageState {
  return state;
}

export function subscribe(fn: StateListener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Añade imágenes hasta el máximo; devuelve las que se pudieron añadir */
export function addImages(urls: string[]): CollageImage[] {
  const added: CollageImage[] = [];
  for (const url of urls) {
    if (state.images.length >= MAX_IMAGES) break;
    added.push(createCollageImage(url));
  }
  if (added.length === 0) return added;
  state = { ...state, images: [...state.images, ...added] };
  notify();
  return added;
}

/** Elimina la imagen por id */
export function removeImage(id: string): void {
  const images = state.images.filter((img) => img.id !== id);
  if (images.length === state.images.length) return;
  state = { ...state, images };
  notify();
}

/** Actualiza transform (scale, translate) de una imagen por id */
export function updateImageTransform(
  id: string,
  patch: Partial<Pick<CollageImage, 'scale' | 'translateX' | 'translateY'>>
): void {
  const images = state.images.map((img) =>
    img.id === id ? { ...img, ...patch } : img
  );
  state = { ...state, images };
  notify();
}

/** Intercambia dos imágenes por índice (mantiene transforms) */
export function swapImages(indexA: number, indexB: number): void {
  const images = [...state.images];
  if (indexA < 0 || indexB < 0 || indexA >= images.length || indexB >= images.length) return;
  [images[indexA], images[indexB]] = [images[indexB], images[indexA]];
  state = { ...state, images };
  notify();
}

/** Activa o desactiva el filtro B/N global */
export function setGrayscale(value: boolean): void {
  state = { ...state, grayscale: value };
  notify();
}

/** Comprueba si el número actual de imágenes es válido para el collage (6–12) */
export function canShowCollage(): boolean {
  const n = state.images.length;
  return n >= MIN_IMAGES && n <= MAX_IMAGES;
}

export function getImageCount(): number {
  return state.images.length;
}
