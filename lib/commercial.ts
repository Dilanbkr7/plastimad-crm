// Separate from the Cloud API number and its credentials.
export const COMMERCIAL_WHATSAPP_NUMBER = "593995152308";
export const COMMERCIAL_WHATSAPP_PHONE = "+593 99 515 2308";
export const COMMERCIAL_WHATSAPP_URL = `https://wa.me/${COMMERCIAL_WHATSAPP_NUMBER}`;

export function commercialHandoffReply(hasMedia = false): string {
  return [
    "Para información o cotizaciones, por favor comuníquese con nuestro equipo comercial:",
    `${COMMERCIAL_WHATSAPP_PHONE}\n${COMMERCIAL_WHATSAPP_URL}`,
    ...(hasMedia
      ? ["Por favor reenvíe su imagen, audio o documento a ese chat para que un asesor pueda revisarlo."]
      : []),
  ].join("\n\n");
}
