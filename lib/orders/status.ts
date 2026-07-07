/**
 * Estados admitidos por el proceso operativo
 * de pedidos de Plastimad.
 */
export const ORDER_STATUSES = [
  "RECIBIDO",
  "CONFIRMADO",
  "PROGRAMADO",
  "EN_RUTA",
  "ENTREGADO_COBRADO",
  "REPROGRAMAR",
  "NOVEDAD",
  "CANCELADO",
] as const;

export type OrderStatus =
  (typeof ORDER_STATUSES)[number];

/**
 * Etiquetas visibles dentro del CRM.
 */
export const statusLabels: Record<
  OrderStatus,
  string
> = {
  RECIBIDO: "Pedido recibido",
  CONFIRMADO: "Confirmado",
  PROGRAMADO: "Programado",
  EN_RUTA: "En ruta",
  ENTREGADO_COBRADO: "Entregado y cobrado",
  REPROGRAMAR: "Reprogramar",
  NOVEDAD: "Novedad",
  CANCELADO: "Cancelado",
};

/**
 * Clases visuales para cada estado.
 */
export const statusStyles: Record<
  OrderStatus,
  string
> = {
  RECIBIDO:
    "border-blue-200 bg-blue-50 text-blue-700",

  CONFIRMADO:
    "border-cyan-200 bg-cyan-50 text-cyan-700",

  PROGRAMADO:
    "border-amber-200 bg-amber-50 text-amber-700",

  EN_RUTA:
    "border-violet-200 bg-violet-50 text-violet-700",

  ENTREGADO_COBRADO:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  REPROGRAMAR:
    "border-orange-200 bg-orange-50 text-orange-700",

  NOVEDAD:
    "border-rose-200 bg-rose-50 text-rose-700",

  CANCELADO:
    "border-slate-300 bg-slate-100 text-slate-600",
};

/**
 * Transiciones permitidas.
 *
 * Impide saltos incoherentes como:
 * RECIBIDO → ENTREGADO_COBRADO.
 */
export const statusTransitions: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  RECIBIDO: [
    "CONFIRMADO",
    "NOVEDAD",
    "CANCELADO",
  ],

  CONFIRMADO: [
    "PROGRAMADO",
    "NOVEDAD",
    "CANCELADO",
  ],

  PROGRAMADO: [
    "EN_RUTA",
    "REPROGRAMAR",
    "NOVEDAD",
    "CANCELADO",
  ],

  EN_RUTA: [
    "ENTREGADO_COBRADO",
    "REPROGRAMAR",
    "NOVEDAD",
  ],

  REPROGRAMAR: [
    "PROGRAMADO",
    "NOVEDAD",
    "CANCELADO",
  ],

  NOVEDAD: [
    "CONFIRMADO",
    "PROGRAMADO",
    "EN_RUTA",
    "REPROGRAMAR",
    "CANCELADO",
  ],

  ENTREGADO_COBRADO: [],

  CANCELADO: [],
};

/**
 * Estados que obligatoriamente requieren
 * una explicación administrativa.
 */
export const statusesRequiringNote =
  new Set<OrderStatus>([
    "REPROGRAMAR",
    "NOVEDAD",
    "CANCELADO",
  ]);

export function isOrderStatus(
  value: string,
): value is OrderStatus {
  return ORDER_STATUSES.includes(
    value as OrderStatus,
  );
}

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
) {
  return statusTransitions[
    currentStatus
  ].includes(nextStatus);
}