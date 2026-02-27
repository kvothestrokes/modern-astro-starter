import { DESIGN_STATUSES, type DesignStatus } from '../types/status';

/** Mensajes humanos y no técnicos para estados. Sin cambiar keys (lógica intacta). */
export const STATUS_LABELS: Record<DesignStatus, string> = {
  pendiente_pago: 'Pendiente de pago',
  recibido: 'Recibido',
  corregido: 'Corregido',
  listo_para_impresion: 'Listo para imprimir',
  en_espera: 'En espera',
  impreso: 'Impreso',
  cancelado: 'Cancelado',
  falta_diseno: 'Pendiente de diseño',
  falta_imprimir: 'Pendiente de impresión',
  empaquetada: 'Empaquetada',
  en_local: 'En local',
  entregada: 'Entregada',
  enviado: 'Enviado'
};

/**
 * Dorado solo para estados "listos / finales" (calidad, confirmación).
 * Verde = completado; azul = proceso; amarillo = atención; rojo = cancelación.
 */
export const STATUS_BADGE_CLASS: Record<DesignStatus, string> = {
  pendiente_pago: 'bg-amber-100 text-amber-800',
  recibido: 'bg-sky-100 text-sky-800',
  corregido: 'bg-violet-100 text-violet-800',
  listo_para_impresion: 'bg-gold-100 text-gold-800',
  en_espera: 'bg-zinc-200 text-zinc-700',
  impreso: 'bg-blue-100 text-blue-800',
  cancelado: 'bg-red-100 text-red-800',
  falta_diseno: 'bg-rose-100 text-rose-800',
  falta_imprimir: 'bg-orange-100 text-orange-800',
  empaquetada: 'bg-gold-100 text-gold-800',
  en_local: 'bg-lime-100 text-lime-800',
  entregada: 'bg-gold-100 text-gold-800',
  enviado: 'bg-gold-100 text-gold-800'
};

export const DEFAULT_DESIGN_STATUS: DesignStatus = 'falta_diseno';
export const ALL_DESIGN_STATUSES = DESIGN_STATUSES;
