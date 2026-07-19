import Link from "next/link";
import {
  asc,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  notFound,
} from "next/navigation";
import { connection } from "next/server";

import { db } from "@/lib/db";
import {
  conversationMessages,
  conversations,
  leads,
  orders,
} from "@/lib/schema";
import {
  isLeadStatus,
  leadStatusLabels,
  leadStatusStyles,
  type LeadStatus,
} from "@/lib/leads/status";

import LeadUpdateForm from "./LeadUpdateForm";

type LeadDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatDate(
  value: Date | string | null,
) {
  if (!value) {
    return "No registrado";
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function readableValue(
  value: string | null,
) {
  return value?.trim() || "No registrado";
}

function toWhatsappNumber(
  phone: string,
) {
  const digits =
    phone.replace(/\D/g, "");

  if (digits.startsWith("593")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `593${digits.slice(1)}`;
  }

  return digits;
}

function getRoleLabel(role: string) {
  if (role === "USER") {
    return "Visitante";
  }

  if (role === "ASSISTANT") {
    return "Asistente";
  }

  return "Sistema";
}

export default async function LeadDetailPage({
  params,
}: LeadDetailPageProps) {
  await connection();

  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const [lead] = await db
    .select({
      id: leads.id,
      publicId: leads.publicId,
      name: leads.name,
      phone: leads.phone,
      email: leads.email,
      source: leads.source,
      status: leads.status,
      interest: leads.interest,
      summary: leads.summary,
      notes: leads.notes,
      requiresHuman:
        leads.requiresHuman,
      consentAccepted:
        leads.consentAccepted,
      consentAcceptedAt:
        leads.consentAcceptedAt,
      convertedOrderId:
        leads.convertedOrderId,
      convertedOrderProduct:
        orders.product,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(
      orders,
      eq(
        leads.convertedOrderId,
        orders.id,
      ),
    )
    .where(eq(leads.publicId, id))
    .limit(1);

  if (!lead) {
    notFound();
  }

  const conversationRows = await db
    .select({
      id: conversations.id,
      publicId:
        conversations.publicId,
      channel: conversations.channel,
      status: conversations.status,
      lastIntent:
        conversations.lastIntent,
      requiresHuman:
        conversations.requiresHuman,
      createdAt:
        conversations.createdAt,
      updatedAt:
        conversations.updatedAt,
    })
    .from(conversations)
    .where(
      eq(
        conversations.leadId,
        lead.id,
      ),
    )
    .orderBy(
      desc(
        conversations.createdAt,
      ),
    );

  const conversationIds =
    conversationRows.map(
      (conversation) =>
        conversation.id,
    );

  const messageRows =
    conversationIds.length > 0
      ? await db
          .select({
            id: conversationMessages.id,
            conversationId:
              conversationMessages.conversationId,
            role: conversationMessages.role,
            content:
              conversationMessages.content,
            intent:
              conversationMessages.intent,
            createdAt:
              conversationMessages.createdAt,
          })
          .from(conversationMessages)
          .where(
            inArray(
              conversationMessages.conversationId,
              conversationIds,
            ),
          )
          .orderBy(
            asc(
              conversationMessages.createdAt,
            ),
          )
      : [];

  const messagesByConversation =
    new Map<
      number,
      typeof messageRows
    >();

  for (const message of messageRows) {
    const current =
      messagesByConversation.get(
        message.conversationId,
      ) ?? [];

    current.push(message);

    messagesByConversation.set(
      message.conversationId,
      current,
    );
  }

  const currentStatus: LeadStatus =
    isLeadStatus(lead.status)
      ? lead.status
      : "NUEVO";

  const whatsappNumber =
    lead.phone
      ? toWhatsappNumber(
          lead.phone,
        )
      : "";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/crm/leads"
          className="inline-flex items-center text-sm font-bold text-emerald-700 hover:underline"
        >
          ← Volver a leads
        </Link>

        <header className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">
                {lead.name ||
                  "Lead sin nombre"}
              </h1>

              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${leadStatusStyles[currentStatus]}`}
              >
                {
                  leadStatusLabels[
                    currentStatus
                  ]
                }
              </span>

              {lead.requiresHuman && (
                <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                  Atención prioritaria
                </span>
              )}
            </div>

            <p className="mt-3 text-sm text-slate-500">
              Creado el{" "}
              {formatDate(
                lead.createdAt,
              )}
              {" · "}
              Fuente: {lead.source}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                Abrir WhatsApp
              </a>
            )}

            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Enviar correo
              </a>
            )}
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                  Datos de contacto
                </h2>

                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Nombre
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {readableValue(
                        lead.name,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-slate-500">
                      Teléfono
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {readableValue(
                        lead.phone,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-slate-500">
                      Correo
                    </dt>
                    <dd className="mt-1 break-all font-bold text-slate-900">
                      {readableValue(
                        lead.email,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-slate-500">
                      Consentimiento
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {lead.consentAccepted
                        ? `Aceptado el ${formatDate(
                            lead.consentAcceptedAt,
                          )}`
                        : "No registrado"}
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                  Información comercial
                </h2>

                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Interés detectado
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {readableValue(
                        lead.interest,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-slate-500">
                      Resumen
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-700">
                      {readableValue(
                        lead.summary,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-semibold text-slate-500">
                      Pedido convertido
                    </dt>
                    <dd className="mt-1 font-bold text-slate-900">
                      {lead.convertedOrderId ? (
                        <Link
                          href={`/crm/orders/${lead.convertedOrderId}`}
                          className="text-emerald-700 hover:underline"
                        >
                          Pedido #
                          {
                            lead.convertedOrderId
                          }
                          {lead.convertedOrderProduct
                            ? ` · ${lead.convertedOrderProduct}`
                            : ""}
                        </Link>
                      ) : (
                        "Todavía no convertido"
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    Historial de conversación
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Mensajes almacenados por el
                    asistente web.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {
                    conversationRows.length
                  }{" "}
                  conversación
                  {conversationRows.length ===
                  1
                    ? ""
                    : "es"}
                </span>
              </div>

              {conversationRows.length ===
              0 ? (
                <div className="mt-6 rounded-xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  No existen conversaciones
                  asociadas a este lead.
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {conversationRows.map(
                    (conversation) => {
                      const messages =
                        messagesByConversation.get(
                          conversation.id,
                        ) ?? [];

                      return (
                        <article
                          key={
                            conversation.id
                          }
                          className="overflow-hidden rounded-2xl border border-slate-200"
                        >
                          <header className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-bold text-slate-900">
                                Conversación ·{" "}
                                {
                                  conversation.channel
                                }
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(
                                  conversation.createdAt,
                                )}
                                {" · "}
                                {
                                  conversation.status
                                }
                                {conversation.lastIntent
                                  ? ` · ${conversation.lastIntent}`
                                  : ""}
                              </p>
                            </div>

                            {conversation.requiresHuman && (
                              <span className="self-start rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700">
                                Escalada
                              </span>
                            )}
                          </header>

                          <div className="space-y-4 bg-slate-50/60 p-4">
                            {messages.length ===
                            0 ? (
                              <p className="text-sm text-slate-500">
                                Esta conversación
                                no contiene mensajes.
                              </p>
                            ) : (
                              messages.map(
                                (message) => {
                                  const user =
                                    message.role ===
                                    "USER";

                                  const system =
                                    message.role ===
                                    "SYSTEM";

                                  return (
                                    <div
                                      key={
                                        message.id
                                      }
                                      className={`flex ${
                                        user
                                          ? "justify-end"
                                          : "justify-start"
                                      }`}
                                    >
                                      <div
                                        className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                                          user
                                            ? "rounded-br-md bg-emerald-700 text-white"
                                            : system
                                              ? "border border-amber-200 bg-amber-50 text-amber-900"
                                              : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                                        }`}
                                      >
                                        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide opacity-75">
                                          <span>
                                            {getRoleLabel(
                                              message.role,
                                            )}
                                          </span>

                                          {message.intent && (
                                            <span>
                                              ·{" "}
                                              {
                                                message.intent
                                              }
                                            </span>
                                          )}
                                        </div>

                                        <p className="whitespace-pre-wrap">
                                          {
                                            message.content
                                          }
                                        </p>

                                        <p className="mt-2 text-[11px] opacity-70">
                                          {formatDate(
                                            message.createdAt,
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                },
                              )
                            )}
                          </div>
                        </article>
                      );
                    },
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <LeadUpdateForm
              publicId={lead.publicId}
              currentStatus={
                currentStatus
              }
              currentNotes={
                lead.notes
              }
              currentRequiresHuman={
                lead.requiresHuman
              }
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Nota interna actual
              </h2>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {readableValue(
                  lead.notes,
                )}
              </p>

              <p className="mt-4 text-xs text-slate-400">
                Última actualización:{" "}
                {formatDate(
                  lead.updatedAt,
                )}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
