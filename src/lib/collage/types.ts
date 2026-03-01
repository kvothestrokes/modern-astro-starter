/**
 * Tipos del módulo de collage de imágenes.
 * Framework-agnostic; usados por state, layouts y canvasExport.
 */

/** Una imagen en el collage con su transform por celda */
export interface CollageImage {
  id: string;
  url: string; // data URL o object URL
  scale: number;
  translateX: number;
  translateY: number;
}

/** Especificación de una celda del grid (para layouts impares) */
export interface GridCell {
  /** gridArea o equivalente para CSS Grid */
  gridColumn: string;
  gridRow: string;
}

/** Definición del layout para N imágenes */
export interface LayoutSpec {
  /** Número de imágenes (6–12) */
  count: number;
  /** Template de columnas CSS Grid, ej: "1fr 1fr" */
  gridTemplateColumns: string;
  /** Template de filas CSS Grid */
  gridTemplateRows: string;
  /** Por cada índice, cómo ocupa la celda (column/row span o area) */
  cells: GridCell[];
}

/** Opciones de exportación JPG */
export interface ExportOptions {
  /** Ancho en px (lado del cuadrado para 1:1); máx HD = 1920 */
  size: number;
  /** Calidad JPEG 0–1 */
  quality?: number;
  /** Aplicar filtro B/N en la exportación */
  grayscale?: boolean;
}

/** Estado global del módulo collage */
export interface CollageState {
  images: CollageImage[];
  grayscale: boolean;
}

export const MIN_IMAGES = 6;
export const MAX_IMAGES = 12;
export const DEFAULT_EXPORT_SIZE = 1920;
export const MAX_EXPORT_SIZE = 1920;
