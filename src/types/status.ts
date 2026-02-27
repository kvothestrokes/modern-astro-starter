import { ORDER_STATUSES, type OrderStatus } from '../lib/order-status';

/** Same as order workflow states; kept for compatibility with designs and existing code. */
export const DESIGN_STATUSES = ORDER_STATUSES;

/** @deprecated Prefer OrderStatus from lib/order-status. Alias for compatibility. */
export type DesignStatus = OrderStatus;
