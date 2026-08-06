import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  businessSettings,
  deliveryZones,
  offers,
  products,
} from "@/lib/schema";

export type WhatsAppIntent =
  | "HORARIO"
  | "PRECIOS"
  | "ENTREGA"
  | "PAGO"
  | "PRODUCTO"
  | "ASESOR"
  | "SALUDO"
  | "DESCONOCIDA";

type AutomationContext = {
  businessName: string;
  timezone: string;
  openTime: string;
  closeTime: string;
  businessDays: number[];
  products: Array<{
    name: string;
    shortDescription: string | null;
  }>;
  offers: Array<{
    productName: string;
    offerName: string;
    quantity: number;
    priceCents: number;
  }>;
  deliveryZones: Array<{
    name: string;
    city: string | null;
    deliveryFeeCents: number;
    freeDelivery: boolean;
    requiresQuote: boolean;
    cashOnDeliveryAvailable: boolean;
  }>;
};

export type WhatsAppAutomationResult = {
  intent: WhatsAppIntent;
  reply: string;
  requiresHuman: boolean;
  isWithinHumanHours: boolean;
};

function normalizeForMatching(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function detectWhatsAppIntent(message: string): WhatsAppIntent {
  const normalized = normalizeForMatching(message);

  if (
    containsAny(normalized, [
      "asesor",
      "agente",
      "persona real",
      "atencion humana",
      "hablar con alguien",
      "que me llamen",
      "contactenme",
      "vendedor",
    ])
  ) {
    return "ASESOR";
  }

  if (
    containsAny(normalized, [
      "hola",
      "buenos dias",
      "buenas tardes",
      "buenas noches",
      "informacion",
    ])
  ) {
    return "SALUDO";
  }

  if (
    containsAny(normalized, [
      "precio",
      "precios",
      "cuesta",
      "costo",
      "valor",
      "oferta",
      "combo",
      "promocion",
    ])
  ) {
    return "PRECIOS";
  }

  if (
    containsAny(normalized, [
      "entrega",
      "envio",
      "domicilio",
      "courier",
      "provincia",
      "quito",
      "direccion",
      "sector",
    ])
  ) {
    return "ENTREGA";
  }

  if (
    containsAny(normalized, [
      "pago",
      "pagar",
      "transferencia",
      "deuna",
      "payphone",
      "contraentrega",
      "efectivo",
      "tarjeta",
    ])
  ) {
    return "PAGO";
  }

  if (
    containsAny(normalized, [
      "producto",
      "productos",
      "maceta",
      "macetas",
      "material",
      "color",
      "acabado",
      "cnc",
    ])
  ) {
    return "PRODUCTO";
  }

  if (
    containsAny(normalized, [
      "horario",
      "hora",
      "atienden",
      "abierto",
      "abren",
      "cierran",
    ])
  ) {
    return "HORARIO";
  }

  return "DESCONOCIDA";
}

function parseBusinessDays(value: string): number[] {
  const days = value
    .split(",")
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  return days.length > 0 ? days : [1, 2, 3, 4, 5, 6];
}

function parseHourMinute(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function getZonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    weekday: weekdayMap[values.weekday] ?? 0,
    minutes: Number(values.hour ?? 0) * 60 + Number(values.minute ?? 0),
  };
}

function isWithinHumanSupportHours(
  context: AutomationContext,
  date = new Date(),
): boolean {
  const zoned = getZonedParts(date, context.timezone);
  const open = parseHourMinute(context.openTime);
  const close = parseHourMinute(context.closeTime);

  return (
    context.businessDays.includes(zoned.weekday) &&
    zoned.minutes >= open &&
    zoned.minutes < close
  );
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

async function loadAutomationContext(): Promise<AutomationContext> {
  const [settingsRows, productRows, offerRows, zoneRows] = await Promise.all([
    db
      .select({
        businessName: businessSettings.businessName,
        timezone: businessSettings.supportTimezone,
        openTime: businessSettings.supportOpenTime,
        closeTime: businessSettings.supportCloseTime,
        businessDays: businessSettings.supportDays,
      })
      .from(businessSettings)
      .where(eq(businessSettings.code, "plastimad"))
      .limit(1),
    db
      .select({
        name: products.name,
        shortDescription: products.shortDescription,
      })
      .from(products)
      .where(eq(products.active, true))
      .orderBy(asc(products.id))
      .limit(5),
    db
      .select({
        productName: products.name,
        offerName: offers.name,
        quantity: offers.quantity,
        priceCents: offers.priceCents,
      })
      .from(offers)
      .innerJoin(products, eq(offers.productId, products.id))
      .where(and(eq(offers.active, true), eq(products.active, true)))
      .orderBy(asc(offers.sortOrder), asc(offers.quantity))
      .limit(8),
    db
      .select({
        name: deliveryZones.name,
        city: deliveryZones.city,
        deliveryFeeCents: deliveryZones.deliveryFeeCents,
        freeDelivery: deliveryZones.freeDelivery,
        requiresQuote: deliveryZones.requiresQuote,
        cashOnDeliveryAvailable: deliveryZones.cashOnDeliveryAvailable,
      })
      .from(deliveryZones)
      .where(eq(deliveryZones.active, true))
      .orderBy(asc(deliveryZones.id))
      .limit(8),
  ]);

  const settings = settingsRows[0];

  return {
    businessName: settings?.businessName ?? "Plastimad",
    timezone: settings?.timezone ?? "America/Guayaquil",
    openTime: settings?.openTime ?? "08:00",
    closeTime: settings?.closeTime ?? "17:00",
    businessDays: parseBusinessDays(settings?.businessDays ?? "1,2,3,4,5,6"),
    products: productRows,
    offers: offerRows,
    deliveryZones: zoneRows,
  };
}

function buildBaseReply(
  intent: WhatsAppIntent,
  context: AutomationContext,
): string {
  switch (intent) {
    case "PRECIOS":
      return context.offers.length > 0
        ? [
            "Estas son las ofertas activas:",
            ...context.offers.map(
              (offer) =>
                `• ${offer.offerName}: ${offer.quantity} ${
                  offer.quantity === 1 ? "unidad" : "unidades"
                } de ${offer.productName} por ${formatUsd(offer.priceCents)}.`,
            ),
            "Para realizar un pedido, indícame el producto y la cantidad o escribe ASESOR.",
          ].join("\n")
        : "En este momento no encuentro ofertas activas. Escribe ASESOR para que el equipo comercial confirme el precio.";

    case "PRODUCTO":
      return context.products.length > 0
        ? [
            "Productos disponibles:",
            ...context.products.map(
              (product) =>
                `• ${product.name}${
                  product.shortDescription ? `: ${product.shortDescription}` : ""
                }`,
            ),
            "También puedes consultar precios, entregas y métodos de pago.",
          ].join("\n")
        : "El catálogo no muestra productos activos en este momento. Escribe ASESOR para recibir ayuda.";

    case "ENTREGA":
      return context.deliveryZones.length > 0
        ? [
            "Modalidades de entrega configuradas:",
            ...context.deliveryZones.map((zone) => {
              const fee = zone.requiresQuote
                ? "tarifa por confirmar"
                : zone.freeDelivery || zone.deliveryFeeCents === 0
                  ? "entrega gratuita"
                  : `envío de ${formatUsd(zone.deliveryFeeCents)}`;

              return `• ${zone.name}${zone.city ? ` (${zone.city})` : ""}: ${fee}; ${
                zone.cashOnDeliveryAvailable
                  ? "contraentrega disponible"
                  : "contraentrega no disponible"
              }.`;
            }),
            "La cobertura definitiva se confirma con la dirección completa.",
          ].join("\n")
        : "La cobertura y el costo de envío deben confirmarse con un asesor.";

    case "PAGO":
      return [
        "Métodos de pago disponibles:",
        "• Contraentrega en zonas habilitadas.",
        "• Transferencia.",
        "• Deuna.",
        "• PayPhone.",
        "La disponibilidad se confirma según la zona de entrega.",
      ].join("\n");

    case "HORARIO":
      return `Nuestro horario de atención humana es de lunes a sábado, de ${context.openTime} a ${context.closeTime}. El asistente automático puede recibir consultas las 24 horas.`;

    case "ASESOR":
      return "Tu conversación quedó asignada a atención humana. Un asesor continuará la atención dentro del horario de lunes a sábado, de 08:00 a 17:00.";

    case "SALUDO":
      return [
        `Hola. Soy el asistente comercial de ${context.businessName}.`,
        "Puedo ayudarte con:",
        "• Productos",
        "• Precios y promociones",
        "• Entregas",
        "• Métodos de pago",
        "• Atención de un asesor",
        "Escribe el tema que necesitas.",
      ].join("\n");

    case "DESCONOCIDA":
    default:
      return [
        `Soy el asistente comercial de ${context.businessName}.`,
        "No logré identificar la consulta. Puedes escribir PRODUCTOS, PRECIOS, ENTREGA, PAGOS o ASESOR.",
      ].join("\n");
  }
}

export async function buildWhatsAppAutomationReply(options: {
  message: string;
  messageType: string;
}): Promise<WhatsAppAutomationResult> {
  const context = await loadAutomationContext();
  const isWithinHumanHours = isWithinHumanSupportHours(context);

  if (options.messageType !== "text") {
    return {
      intent: "ASESOR",
      requiresHuman: true,
      isWithinHumanHours,
      reply: [
        "Recibimos tu archivo o contenido multimedia.",
        isWithinHumanHours
          ? "Un asesor lo revisará y continuará la atención."
          : "Un asesor lo revisará en la siguiente jornada de atención, de lunes a sábado de 08:00 a 17:00.",
      ].join("\n"),
    };
  }

  const intent = detectWhatsAppIntent(options.message);
  const requiresHuman = intent === "ASESOR";
  const parts = [buildBaseReply(intent, context)];

  if (!isWithinHumanHours && !requiresHuman && intent !== "HORARIO") {
    parts.push(
      "La atención humana está fuera de horario. Nuestro equipo atiende de lunes a sábado, de 08:00 a 17:00.",
    );
  }

  return {
    intent,
    requiresHuman,
    isWithinHumanHours,
    reply: parts.join("\n\n"),
  };
}
