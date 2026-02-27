import type { OrderDraft } from '../types/order';
import { DEFAULT_DESIGN_STATUS } from './constants';

export const ORDER_DRAFT_KEY = 'order-draft-v1';

export const emptyDraft: OrderDraft = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerType: 'mayorista',
  notes: '',
  requiresInvoice: false,
  products: [],
  designs: [],
  assignments: []
};

export function readDraft(): OrderDraft {
  if (typeof window === 'undefined') return emptyDraft;
  const raw = window.localStorage.getItem(ORDER_DRAFT_KEY);
  if (!raw) return emptyDraft;
  try {
    const parsed = JSON.parse(raw) as OrderDraft;
    return {
      ...emptyDraft,
      ...parsed,
      designs: (parsed.designs || []).map((item) => ({
        ...item,
        status: item.status || DEFAULT_DESIGN_STATUS
      }))
    };
  } catch {
    return emptyDraft;
  }
}

export function saveDraft(next: OrderDraft) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(next));
}

export function clearDraft() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ORDER_DRAFT_KEY);
}
