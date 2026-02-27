/**
 * Single source of truth for order workflow states and valid transitions.
 * Used by admin table, APIs, and future automations (n8n, rules).
 */

export const ORDER_STATUSES = [
  'recibido',
  'pendiente_pago',
  'pagado',
  'falta_diseno',
  'en_espera_cliente',
  'diseno_aprobado',
  'listo_para_impresion',
  'falta_imprimir',
  'impreso',
  'tiene_detalle',
  'corregido',
  'empaquetada',
  'en_local',
  'enviado',
  'entregada',
  'cancelado'
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Valid transitions: from state -> array of allowed next states. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  recibido: ['pendiente_pago'],
  pendiente_pago: ['pagado', 'cancelado'],
  pagado: ['falta_diseno'],
  falta_diseno: ['diseno_aprobado', 'en_espera_cliente', 'cancelado'],
  en_espera_cliente: [], // re-entry from other states; no forward from here in diagram (could add back to falta_diseno if needed)
  diseno_aprobado: ['listo_para_impresion'],
  listo_para_impresion: ['falta_imprimir'],
  falta_imprimir: ['impreso', 'en_espera_cliente'],
  impreso: ['empaquetada', 'tiene_detalle'],
  tiene_detalle: ['corregido'],
  corregido: ['listo_para_impresion'],
  empaquetada: ['en_local', 'enviado'],
  en_local: ['entregada'],
  enviado: ['entregada'],
  entregada: [],
  cancelado: []
};

/** Returns allowed next statuses for the given current status. */
export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[current] ?? [];
}

/** Returns true if transition from current to next is allowed. */
export function isTransitionAllowed(current: OrderStatus, next: OrderStatus): boolean {
  return getNextStatuses(current).includes(next);
}

/** Status to set when a new order is created (start of workflow). */
export const INITIAL_ORDER_STATUS: OrderStatus = 'recibido';

/** Groups for filter dropdown: Activos / En espera / Finales */
export const STATUS_GROUP_ACTIVOS: OrderStatus[] = [
  'recibido',
  'pendiente_pago',
  'pagado',
  'falta_diseno',
  'diseno_aprobado',
  'listo_para_impresion',
  'falta_imprimir',
  'impreso',
  'tiene_detalle',
  'corregido',
  'empaquetada',
  'en_local',
  'enviado'
];
export const STATUS_GROUP_ESPERA: OrderStatus[] = ['en_espera_cliente'];
export const STATUS_GROUP_FINALES: OrderStatus[] = ['entregada', 'cancelado'];
