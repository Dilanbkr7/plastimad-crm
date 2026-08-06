import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  sendWhatsAppCrmMessage,
  updateWhatsAppConversationMode,
} from "@/app/crm/whatsapp/actions";
import { db } from "@/lib/db";
import {
  conversationMessages,
  conversations,
} from "@/lib/schema";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string | string[];
    saved?: string | string[];
  }>;
};

function formatDate(value: Date | string | null) {
  if (!value) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}

function errorMessage(code: string) {
  const messages: Record<string, string> = {
    "invalid-mode": "El modo seleccionado no es válido.",
    "empty-message": "Escribe un mensaje antes de enviarlo.",
    "window-expired":
      "La ventana de 24 horas terminó. Para iniciar una nueva conversación se necesitará una plantilla aprobada por Meta.",
    "send-failed":
      "Meta no permitió enviar el mensaje. Revisa el token, el número de prueba y los registros del deploy.",
    "not-found": "La conversación ya no está disponible.",
  };

  return messages[code] ?? "No se pudo completar la operación.";
}


async function getCurrentTime(): Promise<Date> {
  return new Date();
}

const messageStyles: Record<string, string> = {
  INBOUND: "mr-auto border-slate-200 bg-white text-slate-900",
  OUTBOUND: "ml-auto border-emerald-200 bg-emerald-50 text-emerald-950",
  SYSTEM: "mx-auto border-amber-200 bg-amber-50 text-amber-900",
};

export default async function WhatsAppConversationPage({
  params,
  searchParams,
}: PageProps) {
  await connection();

  const { id } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : "";
  const saved = typeof query.saved === "string" ? query.saved : "";

  const [conversation] = await db
    .select({
      id: conversations.id,
      publicId: conversations.publicId,
      contactName: conversations.contactName,
      waId: conversations.whatsappWaId,
      mode: conversations.whatsappMode,
      status: conversations.status,
      requiresHuman: conversations.requiresHuman,
      lastIntent: conversations.lastIntent,
      lastInboundAt: conversations.lastInboundAt,
      lastOutboundAt: conversations.lastOutboundAt,
      windowExpiresAt: conversations.customerServiceWindowExpiresAt,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.publicId, id),
        eq(conversations.channel, "WHATSAPP"),
      ),
    )
    .limit(1);

  if (!conversation) {
    notFound();
  }

  const messages = await db
    .select({
      id: conversationMessages.id,
      role: conversationMessages.role,
      content: conversationMessages.content,
      direction: conversationMessages.direction,
      messageType: conversationMessages.messageType,
      status: conversationMessages.deliveryStatus,
      origin: conversationMessages.origin,
      errorMessage: conversationMessages.errorMessage,
      createdAt: conversationMessages.createdAt,
      sentAt: conversationMessages.sentAt,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversation.id))
    .orderBy(asc(conversationMessages.createdAt))
    .limit(1_000);

  const currentTime = await getCurrentTime();
  const windowIsOpen = Boolean(
    conversation.windowExpiresAt &&
      conversation.windowExpiresAt.getTime() > currentTime.getTime(),
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/crm/whatsapp"
          className="text-sm font-bold text-emerald-700 hover:text-emerald-900"
        >
          ← Volver a conversaciones
        </Link>

        <header className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Conversación de WhatsApp
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">
                {conversation.contactName || `+${conversation.waId}`}
              </h1>
              <p className="mt-1 text-sm text-slate-500">+{conversation.waId}</p>
              <p className="mt-3 text-sm text-slate-600">
                Última intención: {conversation.lastIntent || "No identificada"}
              </p>
            </div>
            <div className="text-sm text-slate-600">
              <p>
                Modo: <strong>{conversation.mode}</strong>
              </p>
              <p className="mt-1">
                Ventana de servicio: {windowIsOpen ? "Abierta" : "Cerrada"}
              </p>
              <p className="mt-1">
                Vence: {formatDate(conversation.windowExpiresAt)}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              ["AUTOMATICO", "Activar bot"],
              ["HUMANO", "Atención humana"],
              ["CERRADO", "Cerrar conversación"],
            ].map(([mode, label]) => (
              <form key={mode} action={updateWhatsAppConversationMode}>
                <input type="hidden" name="conversationId" value={conversation.publicId} />
                <input type="hidden" name="mode" value={mode} />
                <button
                  type="submit"
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    conversation.mode === mode
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              </form>
            ))}
          </div>
        </header>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
            {errorMessage(error)}
          </div>
        ) : null}

        {saved ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            Cambio guardado correctamente.
          </div>
        ) : null}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-200/60 p-4 shadow-sm">
          <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                No existen mensajes registrados.
              </p>
            ) : (
              messages.map((message) => {
                const direction = message.direction ||
                  (message.role === "USER" ? "INBOUND" : message.role === "SYSTEM" ? "SYSTEM" : "OUTBOUND");

                return (
                  <article
                    key={message.id}
                    className={`w-full max-w-[85%] rounded-2xl border p-4 shadow-sm ${
                      messageStyles[direction] ?? messageStyles.SYSTEM
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {message.content}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold opacity-70">
                      <span>{message.origin || message.role}</span>
                      <span>{message.messageType || "text"}</span>
                      <span>{message.status || "REGISTRADO"}</span>
                      <span>{formatDate(message.sentAt ?? message.createdAt)}</span>
                    </div>
                    {message.errorMessage ? (
                      <p className="mt-2 text-xs font-semibold text-rose-700">
                        {message.errorMessage}
                      </p>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">Responder desde el CRM</h2>
          <p className="mt-1 text-sm text-slate-500">
            El envío de texto libre solo está permitido dentro de las 24 horas posteriores al último mensaje del cliente.
          </p>

          <form action={sendWhatsAppCrmMessage} className="mt-4">
            <input type="hidden" name="conversationId" value={conversation.publicId} />
            <textarea
              name="message"
              rows={4}
              maxLength={4_000}
              required
              disabled={!windowIsOpen}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 disabled:bg-slate-100 disabled:text-slate-400"
              placeholder={
                windowIsOpen
                  ? "Escribe la respuesta para el cliente..."
                  : "La ventana de 24 horas está cerrada."
              }
            />
            <button
              type="submit"
              disabled={!windowIsOpen}
              className="mt-3 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              Enviar por WhatsApp
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
