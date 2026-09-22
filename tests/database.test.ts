import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "../lib/schema";
import { recordIncomingMessage } from "../lib/whatsapp/record-message";

test("database: retries preserve one lead and exactly two answers plus handoff; all test rows roll back", {
  skip: process.env.RUN_DATABASE_TESTS !== "1", timeout: 30_000,
}, async () => {
  dotenv.config({ path: ".env.local", quiet: true });
  const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1, connect_timeout: 10 });
  const database = drizzle(client, { schema });
  const rollback = new Error("intentional-test-rollback");
  try {
    await assert.rejects(database.transaction(async (tx) => {
      const [conversation] = await tx.insert(schema.conversations).values({
        channel: "WHATSAPP", whatsappWaId: `test-${randomUUID().slice(0, 24)}`,
      }).returning();
      const input = {
        conversationId: conversation.id, metaMessageId: `test-${randomUUID()}`, waId: "0000000000",
        intent: "PRECIOS", contactName: "Prueba transaccional", phoneNumberId: "test", autoReplyEnabled: true,
        receivedAt: new Date(), message: {}, draft: { reply: "Respuesta de catálogo" },
        extracted: { content: "precios", messageType: "text", mediaId: null, mediaType: null, replyToMetaMessageId: null },
      };
      await recordIncomingMessage(tx, input);
      await recordIncomingMessage(tx, input); // The identical Meta delivery is ignored.
      for (let i = 0; i < 4; i++) await recordIncomingMessage(tx, { ...input, metaMessageId: `test-${randomUUID()}` });
      const messages = await tx.select().from(schema.conversationMessages)
        .where(eq(schema.conversationMessages.conversationId, conversation.id)).orderBy(asc(schema.conversationMessages.id));
      const replies = messages.filter((m) => m.direction === "OUTBOUND");
      assert.equal(messages.filter((m) => m.direction === "INBOUND").length, 5);
      assert.equal(replies.length, 3);
      assert.equal(replies[0].content, "Respuesta de catálogo");
      assert.equal(replies[1].content, "Respuesta de catálogo");
      assert.match(replies[2].content, /https:\/\/wa.me\/593995152308/);
      assert.ok(replies.every((m) => m.deliveryStatus === "PENDING"));
      const [current] = await tx.select().from(schema.conversations).where(eq(schema.conversations.id, conversation.id));
      assert.equal(current.botReplyCount, 3);
      assert.ok(current.botHandoffAt);
      assert.ok(current.leadId);
      const [lead] = await tx.select().from(schema.leads).where(eq(schema.leads.id, current.leadId!));
      assert.equal(lead.source, "WHATSAPP");
      assert.equal(lead.consentAccepted, false);
      assert.equal(lead.requiresHuman, true);

      // Manual reset grants a fresh two-answer budget; media shortcuts it immediately.
      await tx.update(schema.conversations).set({ botReplyCount: 0, botHandoffAt: null, whatsappMode: "AUTOMATICO" })
        .where(eq(schema.conversations.id, conversation.id));
      await recordIncomingMessage(tx, { ...input, metaMessageId: `test-${randomUUID()}`,
        extracted: { ...input.extracted, messageType: "audio", content: "[Audio recibido]" }, draft: null });
      const [audioReply] = await tx.select().from(schema.conversationMessages)
        .where(eq(schema.conversationMessages.conversationId, conversation.id)).orderBy(asc(schema.conversationMessages.id)).offset(messages.length + 1);
      assert.match(audioReply.content, /reenvíe/);
      throw rollback;
    }), (error) => error === rollback);
  } finally { await client.end(); }
});
