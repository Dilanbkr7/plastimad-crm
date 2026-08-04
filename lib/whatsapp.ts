/**
 * Utilidades compartidas para números y enlaces de WhatsApp.
 *
 * La empresa guarda el número técnico en formato internacional,
 * solo con dígitos. Ejemplo: 593995152308.
 */
const ECUADOR_COUNTRY_CODE = "593";
const ECUADOR_MOBILE_PATTERN = /^5939\d{8}$/;

/**
 * Convierte números ecuatorianos comunes al formato internacional
 * utilizado por WhatsApp.
 */
export function toWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith(ECUADOR_COUNTRY_CODE)) {
    return digits;
  }

  if (/^09\d{8}$/.test(digits)) {
    return `${ECUADOR_COUNTRY_CODE}${digits.slice(1)}`;
  }

  if (/^9\d{8}$/.test(digits)) {
    return `${ECUADOR_COUNTRY_CODE}${digits}`;
  }

  return digits;
}

/**
 * Valida un celular ecuatoriano en formato internacional.
 */
export function isValidEcuadorMobile(value: string): boolean {
  return ECUADOR_MOBILE_PATTERN.test(
    toWhatsAppNumber(value),
  );
}

/**
 * Presenta el número empresarial de forma legible.
 * Ejemplo: +593 99 515 2308.
 */
export function formatEcuadorMobile(value: string): string {
  const digits = toWhatsAppNumber(value);

  if (!ECUADOR_MOBILE_PATTERN.test(digits)) {
    return value.trim();
  }

  return `+593 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`;
}

/**
 * Construye un enlace seguro de WhatsApp. Devuelve una cadena vacía
 * cuando el número no cumple una longitud internacional razonable.
 */
export function createWhatsAppUrl(
  value: string,
  message?: string,
): string {
  const number = toWhatsAppNumber(value);

  if (!/^\d{8,15}$/.test(number)) {
    return "";
  }

  const baseUrl = `https://wa.me/${number}`;
  const cleanMessage = message?.trim();

  return cleanMessage
    ? `${baseUrl}?text=${encodeURIComponent(cleanMessage)}`
    : baseUrl;
}
