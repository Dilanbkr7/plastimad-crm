import { and, eq } from "drizzle-orm";  
  import { db } from "@/lib/db";
  import {
    conversationMessages,
    conversations,
  } from "@/lib/schema";
  import { buildWhatsAppAutomationReply } from "@/lib/whatsapp/automation";
  import {
    getWhatsAppRuntimeConfig,
    markWhatsAppMessageRead,
    sendWhatsAppText,
    verifyMetaWebhookSignature,
    WhatsAppApiError,
    WhatsAppConfigurationError,
  } from "@/lib/whatsapp/cloud";
  import {
    getNextAssignedUserId,
  } from "@/lib/whatsapp/assignment";

  import {
    getContactName,
    getPhoneNumberId,
    parseMetaChanges,
    readMetaMessageEchoes,
    readMetaMessages,
    readMetaStatuses,
    readWebhookString,
    type MetaMessage,
    type MetaMessageEcho,
    type MetaStatus,
    type MetaWebhookPayload,
  } from "@/lib/whatsapp/webhook-types";
  import {
  getWhatsAppMediaUrl,
} from "@/lib/whatsapp/media";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";

  const MAX_WEBHOOK_BYTES = 1_048_576;
  const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1_000;

  type WhatsAppConversationRow = {
    id: number;
    publicId: string;
    whatsappMode: string;
    status: string;
  };

  function noStoreHeaders(contentType = "application/json") {
    return {
      "Cache-Control": "no-store",
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    };
  }

  function jsonResponse(body: unknown, status = 200) {
    return Response.json(body, {
      status,
      headers: noStoreHeaders(),
    });
  }

  function parseUnixTimestamp(value: unknown): Date {
    const seconds = Number(readWebhookString(value, 30));

    return Number.isFinite(seconds) && seconds > 0
      ? new Date(seconds * 1_000)
      : new Date();
  }

  function addServiceWindow(date: Date): Date {
    return new Date(date.getTime() + SERVICE_WINDOW_MS);
  }

  function extractMessageContent(message: MetaMessage): {
    content: string;
    messageType: string;
    replyToMetaMessageId: string | null;
    mediaId: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
  } {
    const type = readWebhookString(message.type, 40) || "unknown";
    const replyToMetaMessageId =
      readWebhookString(message.context?.id, 255) || null;

    if (type === "text") {
      return {
        content:
          readWebhookString(message.text?.body, 4_000) ||
          "[Mensaje de texto vacío]",
        messageType: type,
        replyToMetaMessageId,
        mediaId: null,
        mediaUrl: null,
        mediaType: null,
      };
    }

    if (type === "button") {
      const text = readWebhookString(message.button?.text, 1_000);
      const payload = readWebhookString(message.button?.payload, 1_000);

      return {
        content: text || payload || "[Respuesta de botón]",
        messageType: type,
        replyToMetaMessageId,
        mediaId: null,
        mediaUrl: null,
        mediaType: null,
      };
    }

    if (type === "interactive") {
      const buttonTitle = readWebhookString(
        message.interactive?.button_reply?.title,
        1_000,
      );
      const listTitle = readWebhookString(
        message.interactive?.list_reply?.title,
        1_000,
      );
      const listDescription = readWebhookString(
        message.interactive?.list_reply?.description,
        1_000,
      );

      return {
        content:
          buttonTitle ||
          [listTitle, listDescription].filter(Boolean).join(" — ") ||
          "[Respuesta interactiva]",
        messageType: type,
        replyToMetaMessageId,
        mediaId: null,
        mediaUrl: null,
        mediaType: null,
      };
    }

    if (type === "image") {
      const caption = readWebhookString(message.image?.caption, 2_000);
      const mediaId = readWebhookString(message.image?.id, 255) || null;

      return {
        content: caption ? `[Imagen] ${caption}` : "[Imagen recibida]",
        messageType: type,
        replyToMetaMessageId,
        mediaId,
        mediaUrl: null,
        mediaType:
          readWebhookString(
            message.image?.mime_type,
            50,
          )|| "IMAGE",
      };
    }

    if (type === "video") {
      const caption = readWebhookString(message.video?.caption, 2_000);
      const mediaId = readWebhookString(message.video?.id, 255) || null;

      return {
        content: caption ? `[Video] ${caption}` : "[Video recibido]",
        messageType: type,
        replyToMetaMessageId,
        mediaId,
        mediaUrl: null,
        mediaType: "VIDEO",
      };
    }

    if (type === "document") {
      const filename = readWebhookString(message.document?.filename, 500);
      const caption = readWebhookString(message.document?.caption, 2_000);
      const mediaId = readWebhookString(message.document?.id, 255) || null;

      return {
        content:
          ["[Documento recibido]", filename, caption]
            .filter(Boolean)
            .join(" ") || "[Documento recibido]",
        messageType: type,
        replyToMetaMessageId,
        mediaId,
        mediaUrl: null,
        mediaType: "DOCUMENT",
      };
    }

    if (type === "audio") {
      const mediaId = readWebhookString(message.audio?.id, 255) || null;

      return {
        content: "[Audio recibido]",
        messageType: type,
        replyToMetaMessageId,
        mediaId,
        mediaUrl: null,
        mediaType: "AUDIO",
      };
    }

    if (type === "sticker") {
      const mediaId = readWebhookString(message.sticker?.id, 255) || null;

      return {
        content: "[Sticker recibido]",
        messageType: type,
        replyToMetaMessageId,
        mediaId,
        mediaUrl: null,
        mediaType: "STICKER",
      };
    }

    if (type === "location") {
      const name = readWebhookString(message.location?.name, 500);
      const address = readWebhookString(message.location?.address, 1_000);

      return {
        content:
          ["[Ubicación recibida]", name, address]
            .filter(Boolean)
            .join(" — ") || "[Ubicación recibida]",
        messageType: type,
        replyToMetaMessageId,
        mediaId: null,
        mediaUrl: null,
        mediaType: "LOCATION",
      };
    }

    if (type === "reaction") {
      const emoji = readWebhookString(message.reaction?.emoji, 20);

      return {
        content: emoji ? `[Reacción] ${emoji}` : "[Reacción recibida]",
        messageType: type,
        replyToMetaMessageId:
          readWebhookString(message.reaction?.message_id, 255) ||
          replyToMetaMessageId,
        mediaId: null,
        mediaUrl: null,
        mediaType: "REACTION",
      };
    }

    return {
      content: `[Mensaje ${type} recibido]`,
      messageType: type,
      replyToMetaMessageId,
      mediaId: null,
      mediaUrl: null,
      mediaType: type.toUpperCase(),
    };
  }



  async function findWhatsAppConversation(
    waId: string,
  ): Promise<WhatsAppConversationRow | undefined> {
    const [row] = await db
      .select({
        id: conversations.id,
        publicId: conversations.publicId,
        whatsappMode: conversations.whatsappMode,
        status: conversations.status,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.channel, "WHATSAPP"),
          eq(conversations.whatsappWaId, waId),
        ),
      )
      .limit(1);

    return row;
  }

  async function findOrCreateWhatsAppConversation(options: {
    waId: string;
    phoneNumberId: string;
    contactName: string | null;
    receivedAt?: Date;
  }): Promise<WhatsAppConversationRow> {
    const existing = await findWhatsAppConversation(options.waId);

    if (existing) {
      return existing;
    }

    const assignedUserId = await getNextAssignedUserId();

    const [created] = await db
      .insert(conversations)
      .values({
        channel: "WHATSAPP",
        assignedUserId,
        status: "ABIERTA",
        contactName: options.contactName,
        whatsappWaId: options.waId,
        whatsappPhoneNumberId: options.phoneNumberId,
        whatsappMode: "AUTOMATICO",
        lastInboundAt: options.receivedAt ?? null,
        customerServiceWindowExpiresAt: options.receivedAt
          ? addServiceWindow(options.receivedAt)
          : null,
        updatedAt: new Date(),
      })
      .onConflictDoNothing({
        target: conversations.whatsappWaId,
      })
      .returning({
        id: conversations.id,
        publicId: conversations.publicId,
        whatsappMode: conversations.whatsappMode,
        status: conversations.status,
      });

    if (created) {
      return created;
    }

    const raced = await findWhatsAppConversation(options.waId);

    if (!raced) {
      throw new Error("No se pudo crear ni recuperar la conversación de WhatsApp.");
    }

    return raced;
  }

  async function saveOutboundReply(options: {
    conversationId: number;
    waId: string;
    body: string;
    replyToMetaMessageId: string;
    phoneNumberId: string;
  }) {
    try {
      const result = await sendWhatsAppText({
        to: options.waId,
        body: options.body,
        replyToMessageId: options.replyToMetaMessageId,
      });

      const now = new Date();

      await db.insert(conversationMessages).values({
        conversationId: options.conversationId,
        role: "ASSISTANT",
        content: options.body,
        metaMessageId: result.messageId,
        direction: "OUTBOUND",
        messageType: "text",
        deliveryStatus: "SENT",
        origin: "CLOUD_API",
        replyToMetaMessageId: options.replyToMetaMessageId,
        sentAt: now,
        rawPayload: {
          phoneNumberId: options.phoneNumberId,
        },
      });

      await db
        .update(conversations)
        .set({
          lastOutboundAt: now,
          updatedAt: now,
        })
        .where(eq(conversations.id, options.conversationId));
    } catch (error) {
      const now = new Date();
      const code =
        error instanceof WhatsAppApiError && error.code !== null
          ? String(error.code)
          : null;
      const message =
        error instanceof Error
          ? error.message.slice(0, 2_000)
          : "Error desconocido al enviar el mensaje.";

      await db.insert(conversationMessages).values({
        conversationId: options.conversationId,
        role: "SYSTEM",
        content: options.body,
        direction: "OUTBOUND",
        messageType: "text",
        deliveryStatus: "FAILED",
        origin: "CLOUD_API",
        replyToMetaMessageId: options.replyToMetaMessageId,
        errorCode: code,
        errorMessage: message,
        failedAt: now,
        rawPayload:
          error instanceof WhatsAppApiError
            ? error.details
            : null,
      });

      console.error("No se pudo enviar la respuesta automática de WhatsApp:", error);
    }
  }

  async function processIncomingMessage(options: {
    message: MetaMessage;
    phoneNumberId: string;
    contactName: string | null;
    autoReplyEnabled: boolean;
  }) {
    const waId = readWebhookString(options.message.from, 32).replace(/\D/g, "");
    const metaMessageId = readWebhookString(options.message.id, 255);

    if (!waId || !metaMessageId) {
      return;
    }

    const receivedAt = parseUnixTimestamp(options.message.timestamp);
    console.log(
      "MENSAJE ORIGINAL META:",
      JSON.stringify(options.message, null, 2)
  );


    const extracted = extractMessageContent(options.message);
    let mediaUrl = extracted.mediaUrl;
    if (

      extracted.mediaId &&
      extracted.messageType === "image"
    ) {
      console.log(
        "CONSULTANDO MEDIA ID:",
        extracted.mediaId,
      );
      mediaUrl = await getWhatsAppMediaUrl(
        extracted.mediaId,
    );

    console.log(
      "MEDIA URL OBTENIDA:",
        mediaUrl,
      );
    } 
    console.log(
      "EXTRACTED RESULT:",
      {
        ...extracted,
        mediaUrl,
      },
    );

    const conversation = await findOrCreateWhatsAppConversation({
      waId,
      phoneNumberId: options.phoneNumberId,
      contactName: options.contactName,
      receivedAt,
    });

    const reopened = conversation.whatsappMode === "CERRADO";
    const activeMode = reopened ? "AUTOMATICO" : conversation.whatsappMode;
    const automation = await buildWhatsAppAutomationReply({
      message: extracted.content,
      messageType: extracted.messageType,
    });
    const newlyEscalated =
      automation.requiresHuman && activeMode !== "HUMANO";
    const remainsHuman =
      activeMode === "HUMANO" || automation.requiresHuman;
    const nextMode = remainsHuman ? "HUMANO" : activeMode;
    const now = new Date();

    const processed = await db.transaction(async (transaction) => {
      const inserted = await transaction
        .insert(conversationMessages)
        .values({
          conversationId: conversation.id,
          role: "USER",
          content: extracted.content,
          intent: automation.intent,

          metaMessageId,

          direction: "INBOUND",
          messageType: extracted.messageType,

          mediaId: extracted.mediaId,
          mediaUrl,
          mediaType: extracted.mediaType,
          
          deliveryStatus: "RECEIVED",
          origin: "CUSTOMER",

          replyToMetaMessageId:
            extracted.replyToMetaMessageId,
          sentAt: receivedAt,
          rawPayload: options.message,
        })
        .onConflictDoNothing({
          target: conversationMessages.metaMessageId,
        })
        .returning({ id: conversationMessages.id });

      if (inserted.length === 0) {
        return false;
      }

      await transaction
        .update(conversations)
        .set({
          contactName: options.contactName,
          whatsappPhoneNumberId: options.phoneNumberId,
          whatsappMode: nextMode,
          status: remainsHuman ? "ESCALADA" : "ABIERTA",
          requiresHuman: remainsHuman,
          humanSince: newlyEscalated ? now : reopened ? null : undefined,
          lastIntent: automation.intent,
          lastInboundAt: receivedAt,
          customerServiceWindowExpiresAt: addServiceWindow(receivedAt),
          updatedAt: now,
        })
        .where(eq(conversations.id, conversation.id));

      return true;
    });

    if (!processed) {
      return;
    }

    try {
      await markWhatsAppMessageRead(metaMessageId);
    } catch (error) {
      console.warn("No se pudo marcar el mensaje como leído:", error);
    }

    const shouldReply =
      options.autoReplyEnabled &&
      (activeMode === "AUTOMATICO" || newlyEscalated);

    if (!shouldReply) {
      return;
    }

    await saveOutboundReply({
      conversationId: conversation.id,
      waId,
      body: automation.reply,
      replyToMetaMessageId: metaMessageId,
      phoneNumberId: options.phoneNumberId,
    });
  }

  function statusTimestampPatch(status: string, timestamp: Date) {
    switch (status) {
      case "SENT":
        return { sentAt: timestamp };
      case "DELIVERED":
        return { deliveredAt: timestamp };
      case "READ":
        return { readAt: timestamp };
      case "FAILED":
        return { failedAt: timestamp };
      default:
        return {};
    }
  }

  function readStatusError(status: MetaStatus): {
    code: string | null;
    message: string | null;
  } {
    if (!Array.isArray(status.errors) || status.errors.length === 0) {
      return { code: null, message: null };
    }

    const first = status.errors[0];

    if (!first || typeof first !== "object") {
      return { code: null, message: null };
    }

    const error = first as Record<string, unknown>;
    const errorData =
      error.error_data && typeof error.error_data === "object"
        ? (error.error_data as Record<string, unknown>)
        : null;

    return {
      code: readWebhookString(error.code, 50) || null,
      message:
        readWebhookString(errorData?.details, 2_000) ||
        readWebhookString(error.message, 2_000) ||
        readWebhookString(error.title, 2_000) ||
        null,
    };
  }

  async function processMessageStatus(status: MetaStatus) {
    const metaMessageId = readWebhookString(status.id, 255);
    const rawStatus = readWebhookString(status.status, 30).toUpperCase();

    if (!metaMessageId || !rawStatus) {
      return;
    }

    const timestamp = parseUnixTimestamp(status.timestamp);
    const error = readStatusError(status);

    await db
      .update(conversationMessages)
      .set({
        deliveryStatus: rawStatus,
        errorCode: error.code,
        errorMessage: error.message,
        rawPayload: status,
        ...statusTimestampPatch(rawStatus, timestamp),
      })
      .where(eq(conversationMessages.metaMessageId, metaMessageId));
  }

  async function processMessageEcho(options: {
    echo: MetaMessageEcho;
    phoneNumberId: string;
  }) {
    const waId = readWebhookString(options.echo.to, 32).replace(/\D/g, "");
    const metaMessageId = readWebhookString(options.echo.id, 255);

    if (!waId || !metaMessageId) {
      return;
    }

    const sentAt = parseUnixTimestamp(options.echo.timestamp);
    const extracted = extractMessageContent(options.echo);
    const conversation = await findOrCreateWhatsAppConversation({
      waId,
      phoneNumberId: options.phoneNumberId,
      contactName: null,
    });

    const inserted = await db
      .insert(conversationMessages)
      .values({
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: extracted.content,

        mediaId: extracted.mediaId,
        mediaUrl: extracted.mediaUrl,
        mediaType: extracted.mediaType,

        metaMessageId,
        direction: "OUTBOUND",
        messageType: extracted.messageType,
        deliveryStatus: "SENT",
        origin: "BUSINESS_APP",
        replyToMetaMessageId: extracted.replyToMetaMessageId,
        sentAt,
        rawPayload: options.echo,
      })
      .onConflictDoNothing({
        target: conversationMessages.metaMessageId,
      })
      .returning({ id: conversationMessages.id });

    if (inserted.length === 0) {
      return;
    }

    await db
      .update(conversations)
      .set({
        whatsappMode: "HUMANO",
        status: "ESCALADA",
        requiresHuman: true,
        humanSince: sentAt,
        lastOutboundAt: sentAt,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));
  }

  export async function GET(request: Request) {
    let config;

    try {
      config = getWhatsAppRuntimeConfig();
    } catch (error) {
      const message =
        error instanceof WhatsAppConfigurationError
          ? error.message
          : "La configuración de WhatsApp no está disponible.";

      return new Response(message, {
        status: 503,
        headers: noStoreHeaders("text/plain; charset=utf-8"),
      });
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (
      mode === "subscribe" &&
      token === config.verifyToken &&
      challenge
    ) {
      return new Response(challenge, {
        status: 200,
        headers: noStoreHeaders("text/plain; charset=utf-8"),
      });
    }

    return new Response("Webhook verification failed", {
      status: 403,
      headers: noStoreHeaders("text/plain; charset=utf-8"),
    });
  }

  export async function POST(request: Request) {

    console.log("🔥 WEBHOOK RECIBIDO");
    const contentLength = Number(request.headers.get("content-length") ?? "0");

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_WEBHOOK_BYTES
    ) {
      return jsonResponse({ ok: false, error: "payload-too-large" }, 413);
    }

    let config;

    try {
      config = getWhatsAppRuntimeConfig();
    } catch (error) {
      console.error("Configuración de WhatsApp incompleta:", error);
      return jsonResponse({ ok: false, error: "configuration-unavailable" }, 503);
    }

    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
      return jsonResponse({ ok: false, error: "payload-too-large" }, 413);
    }

    const signatureIsValid = verifyMetaWebhookSignature({
      rawBody,
      signatureHeader: request.headers.get("x-hub-signature-256"),
      appSecret: config.appSecret,
    });

    if (!signatureIsValid) {
      return jsonResponse({ ok: false, error: "invalid-signature" }, 401);
    }

    let payload: MetaWebhookPayload;

    try {
      payload = JSON.parse(rawBody) as MetaWebhookPayload;
    } catch {
      return jsonResponse({ ok: false, error: "invalid-json" }, 400);
    }

    if (payload.object !== "whatsapp_business_account") {
      return jsonResponse({ ok: true, ignored: "unsupported-object" });
    }

    const changes = parseMetaChanges(payload);

    try {
      for (const change of changes) {
        if (
          change.businessAccountId &&
          change.businessAccountId !== config.businessAccountId
        ) {
          continue;
        }

        const phoneNumberId = getPhoneNumberId(change.value);

        if (phoneNumberId && phoneNumberId !== config.phoneNumberId) {
          continue;
        }

        if (change.field === "messages") {
          const contactName = getContactName(change.value);

          for (const message of readMetaMessages(change.value)) {
            await processIncomingMessage({
              message,
              phoneNumberId: phoneNumberId || config.phoneNumberId,
              contactName,
              autoReplyEnabled: config.autoReplyEnabled,
            });
          }

          for (const status of readMetaStatuses(change.value)) {
            await processMessageStatus(status);
          }
        }

        if (change.field === "smb_message_echoes") {
          for (const echo of readMetaMessageEchoes(change.value)) {
            await processMessageEcho({
              echo,
              phoneNumberId: phoneNumberId || config.phoneNumberId,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error procesando webhook de WhatsApp:", error);
      return jsonResponse({ ok: false, error: "processing-failed" }, 500);
    }

    return jsonResponse({ ok: true });
  }