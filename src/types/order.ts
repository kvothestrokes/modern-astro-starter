import type { DesignStatus } from './status';

export type CustomerType = 'minorista' | 'mayorista' | 'empresa' | 'otro';

export interface OrderDraft {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerType: CustomerType;
  notes?: string;
  requiresInvoice: boolean;
  products: ProductDraft[];
  designs: DesignDraft[];
  assignments: AssignmentDraft[];
}

export interface ProductDraft {
  localId: string;
  productType: string;
  size?: string;
  color?: string;
  quantity: number;
  notes?: string;
}

export interface DesignDraft {
  localId: string;
  storagePath?: string;
  originalImageUrl: string;
  status: DesignStatus;
  notes?: string;
}

export interface AssignmentDraft {
  designLocalId: string;
  productLocalId: string;
  position: string;
  scale?: number;
  notes?: string;
}
