import type { OrderHistoryItem } from '../types/order';

export const ORDER_HISTORY_KEY = 'order-history-v1';

const MAX_ITEMS = 50;

export function getOrderHistory(): OrderHistoryItem[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(ORDER_HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is OrderHistoryItem =>
        item &&
        typeof item === 'object' &&
        typeof (item as OrderHistoryItem).orderId === 'string' &&
        typeof (item as OrderHistoryItem).createdAt === 'string' &&
        Array.isArray((item as OrderHistoryItem).products) &&
        (item as OrderHistoryItem).products.every(
          (p) =>
            typeof p.productType === 'string' &&
            (p.name == null || typeof p.name === 'string') &&
            (p.imageUrl == null || typeof p.imageUrl === 'string')
        )
    );
  } catch {
    return [];
  }
}

export function addOrderToHistory(item: OrderHistoryItem): void {
  if (typeof window === 'undefined') return;
  const list = getOrderHistory();
  list.unshift(item);
  const trimmed = list.slice(0, MAX_ITEMS);
  window.localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(trimmed));
}
