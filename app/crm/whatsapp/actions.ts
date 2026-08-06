"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  conversationMessages,
  conversations,
} from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import {
  sendWhatsAppText,
  WhatsAppApiError,
} from "@/lib/whatsapp/cloud";

const VALID_MODES = new Set(["AUTOMATICO", "HUMANO", "CERRADO"]);

async function requireAuthenticatedUser(next: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims ||
    typeof data.claims.sub !== "string"
  ) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
}

function readPublicId(formData: FormData): string {
  const publicId = String(formData.get("conversationId") ?? "").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      publicId,
    )
  ) {
    throw new Error("Identificador de conversación inválido.");
  }

  return publicId;
}

function redirectWithCode(publicId: string, code: string): never {
  redirect(
    `/crm/whatsapp/${publicId}?error=${encodeURIComponent(code)}`,
  );
}

export async function updateWhatsAppConversationMode(formData: FormData) {
  const publicId = readPublicId(formData);
  await requireAuthenticatedUser(`/crm/whatsapp/${publicId}`);

  const mode = String(formData.get("mode") ?? "").trim().toUpperCase();

  if (!VALID_MODES.has(mode)) {
    redirectWithCode(publicId, "invalid-mode");
  }

  const now = new Date();

  const updated = await db
    .update(conversations)
    .set({
      whatsappMode: mode,
      status: mode === "CERRADO" ? "CERRADA" : mode === "HUMANO" ? "ESCALADA" : "ABIERTA",
      requiresHuman: mode === "HUMANO",
      humanSince: mode === "HUMANO" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(conversations.publicId, publicId),
        eq(conversations.channel, "WHATSAPP"),
      ),
    )
    .returning({ id: conversations.id });

  if (updated.length === 0) {
    redirectWithCode(publicId, "not-found");
  }

  revalidatePath("/crm/whatsapp");
  revalidatePath(`/crm/whatsapp/${publicId}`);
  redirect(`/crm/whatsapp/${publicId}?saved=mode`);
}

export async function sendWhatsAppCrmMessage(formData: FormData) {
  const publicId = readPublicId(formData);
  await requireAuthenticatedUser(`/crm/whatsapp/${publicId}`);

  const body = String(formData.get("message") ?? "").trim().slice(0, 4_000);

  if (!body) {
    redirectWithCode(publicId, "empty-message");
  }

  const [conversation] = await db
    .select({
      id: conversations.id,
      waId: conversations.whatsappWaId,
      phoneNumberId: conversations.whatsappPhoneNumberId,
      customerServiceWindowExpiresAt:
        conversations.customerServiceWindowExpiresAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.publicId, publicId),
        eq(conversations.channel, "WHATSAPP"),
      ),
    )
    .limit(1);

  if (!conversation?.waId) {
    redirectWithCode(publicId, "not-found");
  }

  if (
    !conversation.customerServiceWindowExpiresAt ||
    conversation.customerServiceWindowExpiresAt.getTime() <= Date.now()
  ) {
    redirectWithCode(publicId, "window-expired");
  }

  try {
    const result = await sendWhatsAppText({
      to: conversation.waId,
      body,
    });
    const now = new Date();

    await db.transaction(async (transaction) => {
      await transaction.insert(conversationMessages).values({
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: body,
        metaMessageId: result.messageId,
        direction: "OUTBOUND",
        messageType: "text",
        deliveryStatus: "SENT",
        origin: "CRM",
        sentAt: now,
        rawPayload: {
          phoneNumberId: conversation.phoneNumberId,
        },
      });

      await transaction
        .update(conversations)
        .set({
          whatsappMode: "HUMANO",
          status: "ESCALADA",
          requiresHuman: true,
          humanSince: now,
          lastOutboundAt: now,
          updatedAt: now,
        })
        .where(eq(conversations.id, conversation.id));
    });
  } catch (error) {
    console.error("Error enviando mensaje desde el CRM:", error);

    if (error instanceof WhatsAppApiError && error.code === 131047) {
      redirectWithCode(publicId, "window-expired");
    }

    redirectWithCode(publicId, "send-failed");
  }

  revalidatePath("/crm/whatsapp");
  revalidatePath(`/crm/whatsapp/${publicId}`);
  redirect(`/crm/whatsapp/${publicId}?saved=message`);
}
