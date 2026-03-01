/**
 * Layouts del grid del collage para 6–12 imágenes.
 * Pares: grid uniforme. Impares: 1 celda destacada + resto (sin huecos).
 */

import type { GridCell, LayoutSpec } from './types';
import { MAX_IMAGES, MIN_IMAGES } from './types';

/** Layouts predefinidos para cada N en [6..12] */
const LAYOUTS: Record<number, LayoutSpec> = {
  // Par: grid uniforme
  6: {
    count: 6,
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr 1fr',
    cells: [
      { gridColumn: '1', gridRow: '1' },
      { gridColumn: '2', gridRow: '1' },
      { gridColumn: '1', gridRow: '2' },
      { gridColumn: '2', gridRow: '2' },
      { gridColumn: '1', gridRow: '3' },
      { gridColumn: '2', gridRow: '3' }
    ]
  },
  8: {
    count: 8,
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr 1fr 1fr',
    cells: [
      { gridColumn: '1', gridRow: '1' },
      { gridColumn: '2', gridRow: '1' },
      { gridColumn: '1', gridRow: '2' },
      { gridColumn: '2', gridRow: '2' },
      { gridColumn: '1', gridRow: '3' },
      { gridColumn: '2', gridRow: '3' },
      { gridColumn: '1', gridRow: '4' },
      { gridColumn: '2', gridRow: '4' }
    ]
  },
  10: {
    count: 10,
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr 1fr 1fr 1fr',
    cells: [
      { gridColumn: '1', gridRow: '1' },
      { gridColumn: '2', gridRow: '1' },
      { gridColumn: '1', gridRow: '2' },
      { gridColumn: '2', gridRow: '2' },
      { gridColumn: '1', gridRow: '3' },
      { gridColumn: '2', gridRow: '3' },
      { gridColumn: '1', gridRow: '4' },
      { gridColumn: '2', gridRow: '4' },
      { gridColumn: '1', gridRow: '5' },
      { gridColumn: '2', gridRow: '5' }
    ]
  },
  12: {
    count: 12,
    gridTemplateColumns: '1fr 1fr 1fr',
    gridTemplateRows: '1fr 1fr 1fr 1fr',
    cells: [
      { gridColumn: '1', gridRow: '1' },
      { gridColumn: '2', gridRow: '1' },
      { gridColumn: '3', gridRow: '1' },
      { gridColumn: '1', gridRow: '2' },
      { gridColumn: '2', gridRow: '2' },
      { gridColumn: '3', gridRow: '2' },
      { gridColumn: '1', gridRow: '3' },
      { gridColumn: '2', gridRow: '3' },
      { gridColumn: '3', gridRow: '3' },
      { gridColumn: '1', gridRow: '4' },
      { gridColumn: '2', gridRow: '4' },
      { gridColumn: '3', gridRow: '4' }
    ]
  },
  // Impar 7: 1 grande (span 2x2) + 5 pequeñas. Grid 4x2 con área grande en 1-2,1-2
  // Usamos grid de 2 cols x 4 filas: celda 0 ocupa 2x2, resto 1x1 en las otras 5 posiciones
  7: {
    count: 7,
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr 0.5fr 0.5fr 0.5fr',
    cells: [
      { gridColumn: '1 / 3', gridRow: '1 / 3' }, // grande
      { gridColumn: '1', gridRow: '3' },
      { gridColumn: '2', gridRow: '3' },
      { gridColumn: '1', gridRow: '4' },
      { gridColumn: '2', gridRow: '4' },
      { gridColumn: '1', gridRow: '5' },
      { gridColumn: '2', gridRow: '5' }
    ]
  },
  // Impar 9: 1 grande (2x2) + 8 en 2x4
  9: {
    count: 9,
    gridTemplateColumns: '1fr 1fr 1fr',
    gridTemplateRows: '1fr 1fr 1fr 1fr',
    cells: [
      { gridColumn: '1 / 3', gridRow: '1 / 3' }, // grande
      { gridColumn: '3', gridRow: '1' },
      { gridColumn: '3', gridRow: '2' },
      { gridColumn: '1', gridRow: '3' },
      { gridColumn: '2', gridRow: '3' },
      { gridColumn: '3', gridRow: '3' },
      { gridColumn: '1', gridRow: '4' },
      { gridColumn: '2', gridRow: '4' },
      { gridColumn: '3', gridRow: '4' }
    ]
  },
  // Impar 11: 3 filas con 3 + 4 + 4 celdas (fila 1: una celda doble para completar)
  11: {
    count: 11,
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gridTemplateRows: '1fr 1fr 1fr',
    cells: [
      { gridColumn: '1', gridRow: '1' },
      { gridColumn: '2', gridRow: '1' },
      { gridColumn: '3 / 5', gridRow: '1' }, // span 2
      { gridColumn: '1', gridRow: '2' },
      { gridColumn: '2', gridRow: '2' },
      { gridColumn: '3', gridRow: '2' },
      { gridColumn: '4', gridRow: '2' },
      { gridColumn: '1', gridRow: '3' },
      { gridColumn: '2', gridRow: '3' },
      { gridColumn: '3', gridRow: '3' },
      { gridColumn: '4', gridRow: '3' }
    ]
  }
};

/**
 * Devuelve la especificación de layout para N imágenes (6–12).
 * Si N no está en rango o no tiene layout definido, devuelve el de 6 por defecto.
 */
export function getLayoutForCount(n: number): LayoutSpec {
  if (n < MIN_IMAGES || n > MAX_IMAGES) {
    return LAYOUTS[6];
  }
  return LAYOUTS[n] ?? LAYOUTS[6];
}
