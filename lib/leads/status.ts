/**
 * Estados comerciales admitidos para los leads.
 */
export const LEAD_STATUSES = [
  "NUEVO",
  "CONTACTADO",
  "INTERESADO",
  "CONVERTIDO",
  "DESCARTADO",
] as const;

export type LeadStatus =
  (typeof LEAD_STATUSES)[number];

/**
 * Etiquetas visibles dentro del CRM.
 */
export const leadStatusLabels: Record<
  LeadStatus,
  string
> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  INTERESADO: "Interesado",
  CONVERTIDO: "Convertido",
  DESCARTADO: "Descartado",
};

/**
 * Clases visuales para cada estado.
 */
export const leadStatusStyles: Record<
  LeadStatus,
  string
> = {
  NUEVO:
    "border-blue-200 bg-blue-50 text-blue-700",
  CONTACTADO:
    "border-cyan-200 bg-cyan-50 text-cyan-700",
  INTERESADO:
    "border-amber-200 bg-amber-50 text-amber-700",
  CONVERTIDO:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  DESCARTADO:
    "border-slate-300 bg-slate-100 text-slate-600",
};

/**
 * Transiciones permitidas en el pipeline comercial.
 */
export const leadStatusTransitions: Record<
  LeadStatus,
  readonly LeadStatus[]
> = {
  NUEVO: [
    "CONTACTADO",
    "INTERESADO",
    "CONVERTIDO",
    "DESCARTADO",
  ],
  CONTACTADO: [
    "INTERESADO",
    "CONVERTIDO",
    "DESCARTADO",
  ],
  INTERESADO: [
    "CONTACTADO",
    "CONVERTIDO",
    "DESCARTADO",
  ],
  CONVERTIDO: [],
  DESCARTADO: [
    "NUEVO",
    "CONTACTADO",
    "INTERESADO",
  ],
};

export const leadStatusesRequiringNote =
  new Set<LeadStatus>(["DESCARTADO"]);

export const closedLeadStatuses =
  new Set<LeadStatus>([
    "CONVERTIDO",
    "DESCARTADO",
  ]);

export function isLeadStatus(
  value: string,
): value is LeadStatus {
  return LEAD_STATUSES.includes(
    value as LeadStatus,
  );
}

export function canTransitionLeadStatus(
  currentStatus: LeadStatus,
  nextStatus: LeadStatus,
) {
  return leadStatusTransitions[
    currentStatus
  ].includes(nextStatus);
}
