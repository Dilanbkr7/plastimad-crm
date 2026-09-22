import { eq } from "drizzle-orm";
import type { db } from "@/lib/db";
import { conversationMessages, conversations, leads } from "@/lib/schema";
import { commercialHandoffReply } from "@/lib/commercial";
import { decideBotReply } from "@/lib/whatsapp/flow";
import type { MetaMessage } from "@/lib/whatsapp/webhook-types";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Incoming = {
  conversationId: number; metaMessageId: string; waId: string; intent: string;
  contactName: string | null; phoneNumberId: string; autoReplyEnabled: boolean;
  receivedAt: Date; message: MetaMessage; draft: { reply: string } | null;
  extracted: { content: string; messageType: string; mediaId: string | null;
    mediaType: string | null; replyToMetaMessageId: string | null };
};
function addServiceWindow(date: Date) { return new Date(date.getTime() + 24 * 60 * 60 * 1000); }

export async function recordIncomingMessage(tx: Transaction, input: Incoming) {
      const [current] = await tx.select().from(conversations)
        .where(eq(conversations.id, input.conversationId)).limit(1).for("update");
      if (!current) throw new Error("conversation-unavailable");
      const [inserted] = await tx.insert(conversationMessages).values({
        conversationId: current.id, role: "USER", content: input.extracted.content,
        intent: input.intent, metaMessageId: input.metaMessageId, direction: "INBOUND", messageType: input.extracted.messageType,
        mediaId: input.extracted.mediaId, mediaType: input.extracted.mediaType,
        deliveryStatus: "RECEIVED", origin: "CUSTOMER",
        replyToMetaMessageId: input.extracted.replyToMetaMessageId,
        sentAt: input.receivedAt, rawPayload: input.message,
      }).onConflictDoNothing({ target: conversationMessages.metaMessageId }).returning({ id: conversationMessages.id });
      if (!inserted) return;

      let leadId = current.leadId;
      if (!leadId && input.extracted.messageType !== "reaction") {
        const [lead] = await tx.insert(leads).values({
          name: input.contactName, phone: input.waId, source: "WHATSAPP", status: "NUEVO",
          interest: input.intent, consentAccepted: false,
          summary: "Contacto iniciado por el cliente en WhatsApp. Sin consentimiento de marketing registrado.",
        }).returning({ id: leads.id });
        leadId = lead.id;
      }
      let decision = decideBotReply({
        enabled: input.autoReplyEnabled, paused: current.botPaused,
        handedOff: Boolean(current.botHandoffAt), replyCount: current.botReplyCount,
        asksForHuman: input.intent === "ASESOR" || current.whatsappMode === "HUMANO",
        messageType: input.extracted.messageType,
      });
      if (decision === "ANSWER" && !input.draft) decision = "HANDOFF";
      const handoff = decision === "HANDOFF";
      const now = new Date();
      const latestInbound = current.lastInboundAt && current.lastInboundAt > input.receivedAt
        ? current.lastInboundAt : input.receivedAt;
      await tx.update(conversations).set({
        leadId, contactName: input.contactName ?? current.contactName,
        whatsappPhoneNumberId: input.phoneNumberId,
        lastIntent: input.intent, lastInboundAt: latestInbound,
        customerServiceWindowExpiresAt: addServiceWindow(latestInbound), updatedAt: now,
        ...(decision !== "SILENT" ? { botReplyCount: current.botReplyCount + 1 } : {}),
        ...(handoff ? { botHandoffAt: now, whatsappMode: "HUMANO", status: "ESCALADA", requiresHuman: true, humanSince: now } : {}),
      }).where(eq(conversations.id, current.id));
      if (handoff && leadId) await tx.update(leads).set({ requiresHuman: true, updatedAt: now }).where(eq(leads.id, leadId));
      if (decision !== "SILENT") {
        await tx.insert(conversationMessages).values({
          conversationId: current.id, role: "ASSISTANT",
          content: handoff ? commercialHandoffReply(!["text", "button", "interactive"].includes(input.extracted.messageType)) : input.draft!.reply,
          intent: handoff ? "ASESOR" : input.intent, direction: "OUTBOUND", messageType: "text",
          deliveryStatus: "PENDING", origin: "CLOUD_AUTOMATION", replyToMetaMessageId: input.metaMessageId,
          rawPayload: { waId: input.waId, attempts: 0, handoff },
        });
      }
}
