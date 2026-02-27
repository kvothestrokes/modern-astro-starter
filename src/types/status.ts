export const DESIGN_STATUSES = [
  'pendiente_pago',
  'recibido',
  'corregido',
  'listo_para_impresion',
  'en_espera',
  'impreso',
  'cancelado',
  'falta_diseno',
  'falta_imprimir',
  'empaquetada',
  'en_local',
  'entregada',
  'enviado'
] as const;

export type DesignStatus = (typeof DESIGN_STATUSES)[number];
