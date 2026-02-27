export interface GarmentRow {
  id: string;
  order_id: string;
  product_type: string;
  size: string | null;
  color: string | null;
  quantity: number;
  notes: string | null;
}
