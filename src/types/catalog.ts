/**
 * Tipos para el catálogo de productos y el carrito.
 * Compatibles con OrderDraft/ProductDraft del flujo de pedidos existente.
 */

export interface ProductVariantRow {
  id: string;
  product_id: string;
  label: string;
  value: string;
  stock: number | null;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  product_type: string;
  category: string;
  subcategory: string | null;
  tags: string[];
  price: number;
  sale_price: number | null;
  image_urls: string[];
  is_active: boolean;
  created_at: string;
}

export interface ProductWithVariants extends ProductRow {
  product_variants?: ProductVariantRow[];
}

/** Ítem del carrito: producto + variante elegida + cantidad */
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  product_type: string;
  slug: string;
  imageUrl: string;
  price: number;
  sale_price: number | null;
  quantity: number;
  /** Para mostrar en UI (ej. "Talla: M") */
  variant: { label: string; value: string };
  /** Para mapear a ProductDraft en checkout */
  size?: string;
  color?: string;
}

/** Payload para crear/actualizar producto (admin) */
export interface ProductPayload {
  name: string;
  slug: string;
  product_type: string;
  category: string;
  subcategory?: string | null;
  tags?: string[];
  price: number;
  sale_price?: number | null;
  image_urls?: string[];
  is_active?: boolean;
}

/** Fila para carga masiva CSV */
export interface ProductBulkRow {
  name: string;
  product_type: string;
  category: string;
  subcategory?: string;
  price: number;
  sale_price?: number | null;
  tags?: string[];
  image_urls?: string[];
}
