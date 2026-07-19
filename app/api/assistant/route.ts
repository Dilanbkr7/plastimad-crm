import { db } from "@/lib/db";
import {
  businessSettings,
  conversationMessages,
  conversations,
  deliveryZones,
  leads,
  offers,
  products,
} from "@/lib/schema";
import { and, asc, eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssistantIntent =
  | "HORARIO"
  | "PRECIOS"
  | "ENTREGA"
  | "PAGO"
  | "PRODUCTO"
  | "ASESOR"
  | "DESCONOCIDA";

type AssistantRequestBody = {
  conversationId?: unknown;
  message?: unknown;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  consentAccepted?: unknown;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type AssistantContext = {
  businessName: string;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  freeDeliveryEnabled: boolean;
  freeDeliveryCity: string | null;
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
    deliveryType: string;
    deliveryFeeCents: number;
    freeDelivery: boolean;
    requiresQuote: boolean;
    cashOnDeliveryAvailable: boolean;
  }>;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const MAX_BODY_BYTES = 16_384;
const MAX_MESSAGE_LENGTH = 1_500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const globalForAssistant = globalThis as typeof globalThis & {
  __plastimadAssistantRateLimit?: Map<string, RateLimitEntry>;
};

const assistantRateLimit =
  globalForAssistant.__plastimadAssistantRateLimit ??
  new Map<string, RateLimitEntry>();

globalForAssistant.__plastimadAssistantRateLimit =
  assistantRateLimit;

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function readText(
  value: unknown,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function normalizePhone(value: unknown): string {
  const digits = readText(value, 30).replace(/\D/g, "");

  if (digits.startsWith("593") && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }

  return digits;
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeForMatching(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function containsAny(
  normalizedMessage: string,
  terms: string[],
): boolean {
  return terms.some((term) =>
    normalizedMessage.includes(term),
  );
}

function detectIntent(message: string): AssistantIntent {
  const normalized = normalizeForMatching(message);

  if (
    containsAny(normalized, [
      "asesor",
      "agente",
      "atencion humana",
      "persona real",
      "hablar con alguien",
      "que me llamen",
      "contactenme",
      "contactarme",
    ])
  ) {
    return "ASESOR";
  }

  if (
    containsAny(normalized, [
      "precio",
      "precios",
      "cuesta",
      "costo",
      "valor",
      "oferta",
      "ofertas",
      "combo",
      "combos",
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
      "sector",
      "direccion",
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
      "colores",
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

function redactPotentialPersonalData(message: string): string {
  return message
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[correo oculto hasta aceptar el consentimiento]",
    )
    .replace(
      /(?:\+?593[\s-]?)?(?:0?9)\d(?:[\s-]?\d){7,8}/g,
      "[teléfono oculto hasta aceptar el consentimiento]",
    );
}

function getClientKey(request: Request): string {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ?? "";
  const ip =
    forwardedFor.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = (
    request.headers.get("user-agent") ?? "unknown"
  ).slice(0, 120);

  return `${ip}:${userAgent}`;
}

function checkRateLimit(
  request: Request,
): { allowed: true } | {
  allowed: false;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const key = getClientKey(request);
  const current = assistantRateLimit.get(key);

  if (!current || current.resetAt <= now) {
    assistantRateLimit.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return {
      allowed: true,
    };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1_000),
      ),
    };
  }

  current.count += 1;
  assistantRateLimit.set(key, current);

  if (assistantRateLimit.size > 5_000) {
    for (const [storedKey, entry] of assistantRateLimit) {
      if (entry.resetAt <= now) {
        assistantRateLimit.delete(storedKey);
      }
    }
  }

  return {
    allowed: true,
  };
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function getWhatsappUrl(
  whatsappNumber: string | null,
): string | null {
  if (!whatsappNumber) {
    return null;
  }

  const digits = whatsappNumber.replace(/\D/g, "");

  return digits ? `https://wa.me/${digits}` : null;
}

async function loadAssistantContext(): Promise<AssistantContext> {
  const [settingsRows, productRows, offerRows, zoneRows] =
    await Promise.all([
      db
        .select({
          businessName: businessSettings.businessName,
          phone: businessSettings.phone,
          whatsappNumber:
            businessSettings.whatsappNumber,
          email: businessSettings.email,
          freeDeliveryEnabled:
            businessSettings.freeDeliveryEnabled,
          freeDeliveryCity:
            businessSettings.freeDeliveryCity,
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
        .innerJoin(
          products,
          eq(offers.productId, products.id),
        )
        .where(
          and(
            eq(offers.active, true),
            eq(products.active, true),
          ),
        )
        .orderBy(
          asc(offers.sortOrder),
          asc(offers.quantity),
        )
        .limit(8),

      db
        .select({
          name: deliveryZones.name,
          city: deliveryZones.city,
          deliveryType: deliveryZones.deliveryType,
          deliveryFeeCents:
            deliveryZones.deliveryFeeCents,
          freeDelivery: deliveryZones.freeDelivery,
          requiresQuote: deliveryZones.requiresQuote,
          cashOnDeliveryAvailable:
            deliveryZones.cashOnDeliveryAvailable,
        })
        .from(deliveryZones)
        .where(eq(deliveryZones.active, true))
        .orderBy(asc(deliveryZones.id))
        .limit(8),
    ]);

  const settings = settingsRows[0];

  return {
    businessName: settings?.businessName ?? "Plastimad",
    phone: settings?.phone ?? null,
    whatsappNumber: settings?.whatsappNumber ?? null,
    email: settings?.email ?? null,
    freeDeliveryEnabled:
      settings?.freeDeliveryEnabled ?? false,
    freeDeliveryCity:
      settings?.freeDeliveryCity ?? null,
    products: productRows,
    offers: offerRows,
    deliveryZones: zoneRows,
  };
}

function buildBaseReply(
  intent: AssistantIntent,
  context: AssistantContext,
): string {
  switch (intent) {
    case "PRECIOS": {
      if (context.offers.length === 0) {
        return "En este momento no encuentro ofertas activas en el catálogo. He dejado la conversación disponible para que el equipo comercial confirme el precio.";
      }

      const offerLines = context.offers.map(
        (offer) =>
          `• ${offer.offerName} — ${offer.quantity} ${
            offer.quantity === 1 ? "unidad" : "unidades"
          } de ${offer.productName}: ${formatUsd(
            offer.priceCents,
          )}`,
      );

      return [
        "Estas son las ofertas activas:",
        ...offerLines,
        "El precio definitivo siempre se calcula desde el catálogo vigente al registrar el pedido.",
      ].join("\n");
    }

    case "PRODUCTO": {
      if (context.products.length === 0) {
        return "El catálogo no tiene productos activos disponibles en este momento. El equipo comercial puede ayudarte a confirmar existencias.";
      }

      const productLines = context.products.map(
        (product) =>
          `• ${product.name}${
            product.shortDescription
              ? `: ${product.shortDescription}`
              : ""
          }`,
      );

      return [
        "Actualmente puedo ayudarte con estos productos:",
        ...productLines,
        "También puedes preguntarme por precios, entrega, pagos o solicitar un asesor.",
      ].join("\n");
    }

    case "ENTREGA": {
      if (context.deliveryZones.length === 0) {
        return "Todavía no encuentro zonas de entrega activas. El equipo comercial debe confirmar la cobertura y el costo del envío.";
      }

      const zoneLines = context.deliveryZones.map(
        (zone) => {
          const fee = zone.requiresQuote
            ? "tarifa por confirmar"
            : zone.freeDelivery ||
                zone.deliveryFeeCents === 0
              ? "entrega gratuita"
              : `envío ${formatUsd(
                  zone.deliveryFeeCents,
                )}`;

          const payment = zone.cashOnDeliveryAvailable
            ? "contraentrega disponible"
            : "contraentrega no disponible";

          return `• ${zone.name}${
            zone.city ? ` (${zone.city})` : ""
          }: ${fee}; ${payment}.`;
        },
      );

      return [
        "Estas son las modalidades de entrega configuradas:",
        ...zoneLines,
        context.freeDeliveryEnabled &&
        context.freeDeliveryCity
          ? `La configuración comercial indica entrega gratuita en ${context.freeDeliveryCity}, sujeta a validación de la zona seleccionada.`
          : "La tarifa final depende de la zona seleccionada.",
      ].join("\n");
    }

    case "PAGO":
      return [
        "Los métodos configurados para pedidos son:",
        "• Contraentrega, únicamente en zonas habilitadas.",
        "• Transferencia.",
        "• Deuna.",
        "• PayPhone.",
        "La disponibilidad definitiva se valida al registrar el pedido y según la zona de entrega.",
      ].join("\n");

    case "HORARIO":
  return [
    "Nuestro horario de atención es de lunes a sábado, de 08:00 a 17:00.",
    "Fuera de ese horario puedes dejar tu consulta y un asesor te responderá en la siguiente jornada laboral.",
  ].join("\n");

    case "ASESOR":
      return "He marcado esta conversación para atención humana. Comparte tus datos únicamente después de aceptar su almacenamiento, y el equipo comercial podrá continuar el contacto.";

    case "DESCONOCIDA":
    default:
      return [
        `Soy el asistente comercial de ${context.businessName}.`,
        "Puedo ayudarte con productos, precios, entrega, métodos de pago o comunicarte con un asesor.",
        "Escribe qué información necesitas.",
      ].join("\n");
  }
}

function buildReply(options: {
  intent: AssistantIntent;
  context: AssistantContext;
  consentRequired: boolean;
  leadSaved: boolean;
}): string {
  const parts = [
    buildBaseReply(options.intent, options.context),
  ];

  if (options.consentRequired) {
    parts.push(
      "Detecté datos de contacto, pero no los guardaré como lead hasta que aceptes expresamente el tratamiento y almacenamiento de esos datos.",
    );
  }

  if (options.leadSaved) {
    parts.push(
      "Tus datos de contacto y tu consentimiento quedaron registrados para seguimiento comercial.",
    );
  }

  return parts.join("\n\n");
}

function buildLeadSummary(
  intent: AssistantIntent,
  message: string,
): string {
  const cleanMessage = message
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 700);

  return `Consulta web. Intención detectada: ${intent}. Mensaje: ${cleanMessage}`;
}

export async function GET() {
  return jsonResponse({
    ok: true,
    message: "API del asistente de Plastimad funcionando.",
    endpoint: "/api/assistant",
    methods: ["GET", "POST"],
    storage: "server-only",
    rls: true,
  });
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request);

  if (!rateLimit.allowed) {
    return jsonResponse(
      {
        ok: false,
        message:
          "Se alcanzó temporalmente el límite de mensajes. Inténtalo nuevamente en unos segundos.",
      },
      429,
      {
        "Retry-After": String(
          rateLimit.retryAfterSeconds,
        ),
      },
    );
  }

  const contentLength = Number(
    request.headers.get("content-length") ?? "0",
  );

  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_BODY_BYTES
  ) {
    return jsonResponse(
      {
        ok: false,
        message: "La solicitud excede el tamaño permitido.",
      },
      413,
    );
  }

  let body: AssistantRequestBody;

  try {
    body = (await request.json()) as AssistantRequestBody;
  } catch {
    return jsonResponse(
      {
        ok: false,
        message:
          "El cuerpo de la solicitud no contiene JSON válido.",
      },
      400,
    );
  }

  const conversationPublicId = readText(
    body.conversationId,
    50,
  );
  const message = readText(
    body.message,
    MAX_MESSAGE_LENGTH,
  );
  const name = readText(body.name, 150);
  const phone = normalizePhone(body.phone);
  const email = readText(body.email, 255).toLowerCase();
  const consentAccepted = body.consentAccepted === true;

  if (!message) {
    return jsonResponse(
      {
        ok: false,
        message: "Debes enviar un mensaje.",
      },
      400,
    );
  }

  if (
    conversationPublicId &&
    !isValidUuid(conversationPublicId)
  ) {
    return jsonResponse(
      {
        ok: false,
        message:
          "El identificador de la conversación no es válido.",
      },
      400,
    );
  }

  if (name && name.length < 2) {
    return jsonResponse(
      {
        ok: false,
        message:
          "El nombre debe tener al menos 2 caracteres.",
      },
      400,
    );
  }

  if (phone && (phone.length < 9 || phone.length > 15)) {
    return jsonResponse(
      {
        ok: false,
        message: "El teléfono ingresado no es válido.",
      },
      400,
    );
  }

  if (email && !isValidEmail(email)) {
    return jsonResponse(
      {
        ok: false,
        message: "El correo electrónico no es válido.",
      },
      400,
    );
  }

  const hasPersonalData = Boolean(name || phone || email);
  const consentRequired =
    hasPersonalData && !consentAccepted;
  const intent = detectIntent(message);
  const requestedHuman = intent === "ASESOR";

  const storedUserMessage = consentAccepted
    ? message
    : redactPotentialPersonalData(message);

  try {
    const context = await loadAssistantContext();

    const result = await db.transaction(
      async (transaction) => {
        let conversation:
          | {
              id: number;
              publicId: string;
              leadId: number | null;
              status: string;
              requiresHuman: boolean;
            }
          | undefined;

        if (conversationPublicId) {
          [conversation] = await transaction
            .select({
              id: conversations.id,
              publicId: conversations.publicId,
              leadId: conversations.leadId,
              status: conversations.status,
              requiresHuman:
                conversations.requiresHuman,
            })
            .from(conversations)
            .where(
              eq(
                conversations.publicId,
                conversationPublicId,
              ),
            )
            .limit(1);

          if (!conversation) {
            throw new ApiError(
              404,
              "La conversación indicada no existe o ya no está disponible.",
            );
          }
        } else {
          [conversation] = await transaction
            .insert(conversations)
            .values({
              channel: "WEB",
              status: requestedHuman
                ? "ESCALADA"
                : "ABIERTA",
              lastIntent: intent,
              requiresHuman: requestedHuman,
              updatedAt: new Date(),
            })
            .returning({
              id: conversations.id,
              publicId: conversations.publicId,
              leadId: conversations.leadId,
              status: conversations.status,
              requiresHuman:
                conversations.requiresHuman,
            });

          if (!conversation) {
            throw new Error(
              "No se pudo iniciar la conversación.",
            );
          }
        }

        const conversationRequiresHuman =
          conversation.requiresHuman || requestedHuman;

        const nextStatus =
          conversation.status === "ESCALADA" ||
          conversationRequiresHuman
            ? "ESCALADA"
            : "ABIERTA";

        const [updatedConversation] = await transaction
          .update(conversations)
          .set({
            status: nextStatus,
            lastIntent: intent,
            requiresHuman:
              conversationRequiresHuman,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conversation.id))
          .returning({
            id: conversations.id,
            publicId: conversations.publicId,
            leadId: conversations.leadId,
            status: conversations.status,
            requiresHuman:
              conversations.requiresHuman,
          });

        if (!updatedConversation) {
          throw new Error(
            "No se pudo actualizar la conversación.",
          );
        }

        conversation = updatedConversation;

        let leadSaved = false;
        let leadId = conversation.leadId;

        if (
          consentAccepted &&
          hasPersonalData
        ) {
          const now = new Date();
          const summary = buildLeadSummary(
            intent,
            storedUserMessage,
          );

          if (leadId) {
            const [updatedLead] = await transaction
              .update(leads)
              .set({
                ...(name ? { name } : {}),
                ...(phone ? { phone } : {}),
                ...(email ? { email } : {}),
                interest:
                  intent === "DESCONOCIDA"
                    ? null
                    : intent,
                summary,
                consentAccepted: true,
                consentAcceptedAt: now,
                requiresHuman:
                  conversationRequiresHuman,
                updatedAt: now,
              })
              .where(eq(leads.id, leadId))
              .returning({
                id: leads.id,
              });

            if (!updatedLead) {
              throw new Error(
                "No se pudo actualizar el lead.",
              );
            }

            leadSaved = true;
          } else {
            const [newLead] = await transaction
              .insert(leads)
              .values({
                name: name || null,
                phone: phone || null,
                email: email || null,
                source: "WEB_CHAT",
                status: "NUEVO",
                interest:
                  intent === "DESCONOCIDA"
                    ? null
                    : intent,
                summary,
                requiresHuman:
                  conversationRequiresHuman,
                consentAccepted: true,
                consentAcceptedAt: now,
                updatedAt: now,
              })
              .returning({
                id: leads.id,
              });

            if (!newLead) {
              throw new Error(
                "No se pudo crear el lead.",
              );
            }

            leadId = newLead.id;
            leadSaved = true;

            const [linkedConversation] =
              await transaction
                .update(conversations)
                .set({
                  leadId,
                  updatedAt: now,
                })
                .where(
                  eq(
                    conversations.id,
                    conversation.id,
                  ),
                )
                .returning({
                  id: conversations.id,
                });

            if (!linkedConversation) {
              throw new Error(
                "No se pudo asociar el lead con la conversación.",
              );
            }
          }
        } else if (
          leadId &&
          conversationRequiresHuman
        ) {
          await transaction
            .update(leads)
            .set({
              requiresHuman: true,
              updatedAt: new Date(),
            })
            .where(eq(leads.id, leadId));
        }

        const reply = buildReply({
          intent,
          context,
          consentRequired,
          leadSaved,
        });

        await transaction
          .insert(conversationMessages)
          .values([
            {
              conversationId: conversation.id,
              role: "USER",
              content: storedUserMessage,
              intent,
            },
            {
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: reply,
              intent,
            },
          ]);

        return {
          conversationId: conversation.publicId,
          reply,
          intent,
          requiresHuman:
            conversationRequiresHuman,
          status: nextStatus,
          consentRequired,
          leadSaved,
        };
      },
    );

    return jsonResponse(
      {
        ok: true,
        data: {
          ...result,
          contact: {
            businessName: context.businessName,
            phone: context.phone,
            email: context.email,
            whatsappNumber:
              context.whatsappNumber,
            whatsappUrl: getWhatsappUrl(
              context.whatsappNumber,
            ),
          },
        },
      },
      conversationPublicId ? 200 : 201,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse(
        {
          ok: false,
          message: error.message,
        },
        error.status,
      );
    }

    console.error(
      "Error en la API del asistente:",
      error,
    );

    return jsonResponse(
      {
        ok: false,
        message:
          "No se pudo procesar el mensaje. Inténtalo nuevamente o comunícate con Plastimad.",
      },
      500,
    );
  }
}