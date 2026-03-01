/**
 * Store del carrito (cliente). Persistencia en localStorage.
 * Compatible con OrderDraft: al hacer checkout se escribe order-draft-v1 y se redirige a /pedido.
 */

import type { CartItem } from '../../types/catalog';

const CART_KEY = 'catalog-cart-v1';
const DRAFT_KEY = 'order-draft-v1';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('catalog-cart-update', { detail: items }));
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getItems(): CartItem[] {
  return loadCart();
}

export function getSubtotal(): number {
  return loadCart().reduce((sum, item) => {
    const price = item.sale_price != null ? item.sale_price : item.price;
    return sum + price * item.quantity;
  }, 0);
}

export function getCount(): number {
  return loadCart().reduce((sum, item) => sum + item.quantity, 0);
}

export interface AddItemInput {
  productId: string;
  name: string;
  product_type: string;
  slug: string;
  imageUrl: string;
  price: number;
  sale_price: number | null;
  quantity: number;
  variant: { label: string; value: string };
  size?: string;
  color?: string;
}

export function addItem(input: AddItemInput): void {
  if (typeof window !== 'undefined') {
    console.log('[cartStore] addItem llamado', { productId: input.productId, name: input.name, quantity: input.quantity });
  }
  const cart = loadCart();
  const existing = cart.find(
    (i) =>
      i.productId === input.productId &&
      i.variant.label === input.variant.label &&
      i.variant.value === input.variant.value
  );
  if (existing) {
    existing.quantity += input.quantity;
  } else {
    cart.push({
      id: generateId(),
      productId: input.productId,
      name: input.name,
      product_type: input.product_type,
      slug: input.slug,
      imageUrl: input.imageUrl,
      price: input.price,
      sale_price: input.sale_price,
      quantity: input.quantity,
      variant: input.variant,
      size: input.size,
      color: input.color
    });
  }
  saveCart(cart);
  if (typeof window !== 'undefined') {
    console.log('[cartStore] Carrito guardado, ítems:', cart.length, cart);
  }
}

export function removeItem(itemId: string): void {
  saveCart(loadCart().filter((i) => i.id !== itemId));
}

/** Vacía el carrito y dispara catalog-cart-update. */
export function clearCart(): void {
  saveCart([]);
}

export function setQuantity(itemId: string, quantity: number): void {
  if (quantity < 1) {
    removeItem(itemId);
    return;
  }
  const cart = loadCart();
  const item = cart.find((i) => i.id === itemId);
  if (item) {
    item.quantity = quantity;
    saveCart(cart);
  }
}

/**
 * Convierte ítems del carrito a ProductDraft (localId, productType, size, color, quantity).
 * Escribe en localStorage order-draft-v1, limpia el carrito y redirige a /pedido.
 */
export function checkoutToPedido(): void {
  const items = loadCart();
  const products = items.map((item) => {
    const size = item.size ?? (item.variant.label === 'Talla' ? item.variant.value : undefined);
    const color = item.color ?? (item.variant.label === 'Color' ? item.variant.value : undefined);
    return {
      localId: generateId(),
      productType: item.product_type,
      size,
      color,
      quantity: item.quantity,
      notes: undefined
    };
  });

  const draft = {
    customerName: '',
    customerType: 'minorista' as const,
    requiresInvoice: false,
    products,
    designs: [] as Array<{ localId: string; storagePath?: string; originalImageUrl: string; status: string; notes?: string }>,
    assignments: [] as Array<{ designLocalId: string; productLocalId: string; position: string; notes?: string }>
  };

  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  saveCart([]);
  window.location.href = '/pedido';
}

/** Suscribirse a cambios del carrito (para actualizar UI). */
export function onCartUpdate(callback: (items: CartItem[]) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent).detail as CartItem[]);
  window.addEventListener('catalog-cart-update', handler);
  return () => window.removeEventListener('catalog-cart-update', handler);
}
