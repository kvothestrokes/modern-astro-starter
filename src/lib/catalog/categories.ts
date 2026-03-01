/**
 * Categorías y subcategorías para navbar y filtros del catálogo.
 * Alineado con el documento: Ropa, Accesorios, Hogar, Regalos.
 */

export interface SubcategoryItem {
  slug: string;
  label: string;
  product_type: string;
}

export interface CategoryItem {
  slug: string;
  label: string;
  subcategories: SubcategoryItem[];
}

export const CATEGORIES: CategoryItem[] = [
  {
    slug: 'ropa',
    label: 'Ropa',
    subcategories: [
      { slug: 'playera', label: 'Playeras', product_type: 'playera' },
      { slug: 'sudadera', label: 'Sudaderas', product_type: 'sudadera' },
      { slug: 'long-sleeve', label: 'Long sleeve', product_type: 'long sleeve' }
    ]
  },
  {
    slug: 'accesorios',
    label: 'Accesorios',
    subcategories: [
      { slug: 'gorra', label: 'Gorras', product_type: 'gorra' },
      { slug: 'tote-bag', label: 'Tote bags', product_type: 'tote bag' },
      { slug: 'pulsera', label: 'Pulseras sublimadas', product_type: 'pulsera' }
    ]
  },
  {
    slug: 'hogar',
    label: 'Hogar',
    subcategories: [
      { slug: 'taza', label: 'Tazas', product_type: 'taza' },
      { slug: 'tarro', label: 'Tarros', product_type: 'tarro' },
      { slug: 'vela', label: 'Velas aromáticas', product_type: 'vela' }
    ]
  },
  {
    slug: 'regalos',
    label: 'Regalos',
    subcategories: [
      { slug: 'caja-sorpresa', label: 'Cajas sorpresa sublimadas', product_type: 'caja sorpresa' },
      { slug: 'rompecabezas', label: 'Rompecabezas sublimados', product_type: 'rompecabezas' },
      { slug: 'mousepad', label: 'Mousepads sublimados', product_type: 'mousepad' }
    ]
  }
];

/** Todas las opciones product_type para validación y selects */
export const PRODUCT_TYPES_CATALOG = CATEGORIES.flatMap((c) =>
  c.subcategories.map((s) => s.product_type)
);

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as string[];

/** Indica si la categoría del producto es ropa (requiere selección de talla). */
export function isClothingCategory(category: string): boolean {
  return category === 'ropa';
}
