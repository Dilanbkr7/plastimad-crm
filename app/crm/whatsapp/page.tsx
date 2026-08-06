import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import {
  conversationMessages,
  conversations,
} from "@/lib/schema";

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}

function formatPhone(value: string | null) {
  if (!value) {
    return "Número no disponible";
  }

  if (value.startsWith("593") && value.length === 12) {
    return `+593 ${value.slice(3, 5)} ${value.slice(5, 8)} ${value.slice(8)}`;
  }

  return `+${value}`;
}

const modeStyles: Record<string, string> = {
  AUTOMATICO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  HUMANO: "border-amber-200 bg-amber-50 text-amber-700",
  CERRADO: "border-slate-200 bg-slate-100 text-slate-600",
};

export default async function WhatsAppInboxPage() {
  await connection();

  const rows = await db
    .select({
      id: conversations.id,
      publicId: conversations.publicId,
      contactName: conversations.contactName,
      waId: conversations.whatsappWaId,
      mode: conversations.whatsappMode,
      status: conversations.status,
      requiresHuman: conversations.requiresHuman,
      lastInboundAt: conversations.lastInboundAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.channel, "WHATSAPP"))
    .orderBy(
      desc(conversations.requiresHuman),
      desc(conversations.updatedAt),
    )
    .limit(250);

  const ids = rows.map((row) => row.id);
  const recentMessages =
    ids.length > 0
      ? await db
          .select({
            conversationId: conversationMessages.conversationId,
            content: conversationMessages.content,
            createdAt: conversationMessages.createdAt,
          })
          .from(conversationMessages)
          .where(inArray(conversationMessages.conversationId, ids))
          .orderBy(desc(conversationMessages.createdAt))
          .limit(1_000)
      : [];

  const latestByConversation = new Map<
    number,
    { content: string; createdAt: Date }
  >();

  for (const message of recentMessages) {
    if (!latestByConversation.has(message.conversationId)) {
      latestByConversation.set(message.conversationId, {
        content: message.content,
        createdAt: message.createdAt,
      });
    }
  }

  const automaticCount = rows.filter((row) => row.mode === "AUTOMATICO").length;
  const humanCount = rows.filter((row) => row.mode === "HUMANO").length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              WhatsApp Cloud API
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Conversaciones
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Bandeja centralizada para automatización y atención humana.
            </p>
          </div>
          <Link
            href="/api/whatsapp/health"
            target="_blank"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Revisar estado técnico
          </Link>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Conversaciones</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{rows.length}</p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Modo automático</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">{automaticCount}</p>
          </article>
          <article className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Atención humana</p>
            <p className="mt-2 text-3xl font-black text-amber-700">{humanCount}</p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-bold text-slate-900">
                Todavía no existen conversaciones de WhatsApp
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Aparecerán cuando el webhook reciba el primer mensaje del número de prueba de Meta.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {rows.map((row) => {
                const latest = latestByConversation.get(row.id);

                return (
                  <Link
                    key={row.publicId}
                    href={`/crm/whatsapp/${row.publicId}`}
                    className="block px-5 py-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-black text-slate-950">
                            {row.contactName || formatPhone(row.waId)}
                          </h2>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                              modeStyles[row.mode] ?? modeStyles.CERRADO
                            }`}
                          >
                            {row.mode}
                          </span>
                          {row.requiresHuman ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                              Requiere atención
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatPhone(row.waId)}
                        </p>
                        <p className="mt-2 max-w-3xl truncate text-sm text-slate-700">
                          {latest?.content || "Sin mensajes registrados"}
                        </p>
                      </div>
                      <div className="shrink-0 text-sm text-slate-500">
                        {formatDate(latest?.createdAt ?? row.lastInboundAt ?? row.updatedAt)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
