/**
 * Catálogos para el formulario de productos del pedido.
 * Usados en dropdowns y selector de color (swatches).
 */

export const PRODUCT_TYPES = ['Playera', 'Taza', 'Sudadera', 'Gorra', 'Otro'] as const;

export const SIZES = ['NA', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export interface ColorOption {
  value: string;
  label: string;
  hex?: string;
}

export const COLORS: ColorOption[] = [
  { value: 'Negro', label: 'Negro', hex: '#1a1a1a' },
  { value: 'Blanco', label: 'Blanco', hex: '#ffffff' },
  { value: 'Gris', label: 'Gris', hex: '#6b7280' },
  { value: 'Azul marino', label: 'Azul marino', hex: '#1e3a5f' },
  { value: 'Rojo', label: 'Rojo', hex: '#b91c1c' },
  { value: 'Azul', label: 'Azul', hex: '#2563eb' },
  { value: 'Verde', label: 'Verde', hex: '#15803d' },
  { value: 'Amarillo', label: 'Amarillo', hex: '#eab308' },
  { value: 'Rosa', label: 'Rosa', hex: '#ec4899' },
  { value: 'Beige', label: 'Beige', hex: '#d4b896' },
  { value: 'Otro', label: 'Otro', hex: '#9ca3af' }
];

export const POSITIONS = [
  { value: 'front', label: 'Frente' },
  { value: 'back', label: 'Espalda' },
  { value: 'sleeve', label: 'Manga' },
  { value: 'other', label: 'Otro' }
] as const;
