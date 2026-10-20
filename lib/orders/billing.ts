export type BillingDocumentType = "CEDULA" | "RUC";

/** Format validation only; does not query civil-registry or tax records. */
export function validateBillingDocument(type: unknown, number: unknown): string | null {
  if (type !== "CEDULA" && type !== "RUC") {
    return "Selecciona cédula o RUC para la facturación.";
  }
  if (typeof number !== "string" || !(type === "CEDULA" ? /^\d{10}$/ : /^\d{13}$/).test(number)) {
    return type === "CEDULA"
      ? "La cédula debe contener exactamente 10 dígitos."
      : "El RUC debe contener exactamente 13 dígitos.";
  }
  return null;
}

export function isAvailablePaymentMethod(method: string) {
  return method === "CONTRAENTREGA";
}
