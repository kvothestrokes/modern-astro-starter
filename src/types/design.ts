import type { DesignStatus } from './status';

export interface DesignRow {
  id: string;
  order_id: string;
  original_image_url: string;
  processed_image_url: string | null;
  storage_path: string | null;
  status: DesignStatus;
  notes: string | null;
  created_at: string;
}
