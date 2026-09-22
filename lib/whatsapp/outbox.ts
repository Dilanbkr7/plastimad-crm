import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { conversationMessages, conversations } from "@/lib/schema";
import { sendWhatsAppText, WhatsAppApiError } from "@/lib/whatsapp/cloud";

/** A recorded reply survives webhook retries and deployments. */
export async function deliverAutomationReply(inboundId: string): Promise<void> {
  const claimed = await db.transaction(async (tx) => {
    const [message] = await tx.select().from(conversationMessages).where(and(
      eq(conversationMessages.replyToMetaMessageId, inboundId),
      eq(conversationMessages.origin, "CLOUD_AUTOMATION"),
    )).limit(1).for("update");
    if (!message) return null;
    const [conversation] = await tx.select({
      paused: conversations.botPaused,
      expiresAt: conversations.customerServiceWindowExpiresAt,
    }).from(conversations).where(eq(conversations.id, message.conversationId)).limit(1);
    if (["PENDING", "RETRY"].includes(message.deliveryStatus ?? "") &&
      (!conversation || conversation.paused || !conversation.expiresAt || conversation.expiresAt.getTime() <= Date.now())) {
      await tx.update(conversationMessages).set({
        deliveryStatus: "CANCELLED", errorMessage: "Bot pausado o ventana de atención vencida. El contenido permanece guardado.",
      }).where(eq(conversationMessages.id, message.id));
      return null;
    }
    const [earlier] = await tx.select({ id: conversationMessages.id }).from(conversationMessages).where(and(
      eq(conversationMessages.conversationId, message.conversationId),
      eq(conversationMessages.origin, "CLOUD_AUTOMATION"),
      lt(conversationMessages.id, message.id),
      inArray(conversationMessages.deliveryStatus, ["PENDING", "RETRY", "SENDING"]),
    )).limit(1);
    if (earlier) throw new Error("automation-earlier-reply-pending");
    const metadata = (message.rawPayload ?? {}) as { attempts?: number; claimedAt?: number; waId?: string };
    if (message.deliveryStatus === "SENDING") {
      if (Date.now() - (metadata.claimedAt ?? 0) < 90_000) throw new Error("automation-send-in-progress");
      // Meta has no client idempotency key. Never blindly resend an ambiguous delivery.
      await tx.update(conversationMessages).set({
        deliveryStatus: "UNKNOWN", errorMessage: "Envío sin confirmación. Revisar en Meta antes de reenviar.",
      }).where(eq(conversationMessages.id, message.id));
      return null;
    }
    if (!["PENDING", "RETRY"].includes(message.deliveryStatus ?? "")) return null;
    const attempts = (metadata.attempts ?? 0) + 1;
    if (attempts > 3 || !metadata.waId) {
      await tx.update(conversationMessages).set({ deliveryStatus: "FAILED" })
        .where(eq(conversationMessages.id, message.id));
      return null;
    }
    await tx.update(conversationMessages).set({
      deliveryStatus: "SENDING", rawPayload: { ...metadata, attempts, claimedAt: Date.now() },
    }).where(eq(conversationMessages.id, message.id));
    return { ...message, waId: metadata.waId, attempts };
  });
  if (!claimed) return;

  let result;
  try {
    result = await sendWhatsAppText({ to: claimed.waId, body: claimed.content, replyToMessageId: inboundId });
  } catch (error) {
    const rejected = error instanceof WhatsAppApiError;
    const retryable = rejected && (error.status === 429 || error.status >= 500) && claimed.attempts < 3;
    await db.update(conversationMessages).set({
      deliveryStatus: retryable ? "RETRY" : rejected ? "FAILED" : "UNKNOWN",
      failedAt: new Date(),
      errorCode: rejected && error.code !== null ? String(error.code) : null,
      errorMessage: rejected ? error.message.slice(0, 1000) : "No se pudo confirmar el envío. Revisar antes de reenviar.",
    }).where(eq(conversationMessages.id, claimed.id));
    if (retryable) throw new Error("automation-retry-required");
    return;
  }
  // If this write fails, SENDING remains durable and is not blindly resent.
  await db.transaction(async (tx) => {
    await tx.update(conversationMessages).set({
      metaMessageId: result.messageId, deliveryStatus: "SENT", sentAt: new Date(),
      errorCode: null, errorMessage: null,
    }).where(eq(conversationMessages.id, claimed.id));
    await tx.update(conversations).set({ lastOutboundAt: new Date() })
      .where(eq(conversations.id, claimed.conversationId));
  });
}
