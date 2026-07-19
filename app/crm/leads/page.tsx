import Link from "next/link";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  or,
} from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import {
  conversations,
  leads,
} from "@/lib/schema";
import {
  LEAD_STATUSES,
  isLeadStatus,
  leadStatusLabels,
  leadStatusStyles,
  type LeadStatus,
} from "@/lib/leads/status";

type LeadsPageProps = {
  searchParams: Promise<{
    status?: string | string[];
    q?: string | string[];
  }>;
};

function formatDate(
  value: Date | string | null,
) {
  if (!value) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat(
    "es-EC",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/Guayaquil",
    },
  ).format(new Date(value));
}

function readableValue(
  value: string | null,
  fallback = "No registrado",
) {
  return value?.trim() || fallback;
}

function getLeadStatus(
  status: string,
): LeadStatus {
  return isLeadStatus(status)
    ? status
    : "NUEVO";
}

export default async function LeadsPage({
  searchParams,
}: LeadsPageProps) {
  await connection();

  const params = await searchParams;

  const rawStatus =
    typeof params.status === "string"
      ? params.status
          .trim()
          .toUpperCase()
      : "";

  const selectedStatus =
    isLeadStatus(rawStatus)
      ? rawStatus
      : "";

  const query =
    typeof params.q === "string"
      ? params.q
          .trim()
          .slice(0, 120)
      : "";

  const conditions = [];

  if (selectedStatus) {
    conditions.push(
      eq(
        leads.status,
        selectedStatus,
      ),
    );
  }

  if (query) {
    const pattern = `%${query}%`;

    conditions.push(
      or(
        ilike(leads.name, pattern),
        ilike(leads.phone, pattern),
        ilike(leads.email, pattern),
        ilike(
          leads.interest,
          pattern,
        ),
        ilike(
          leads.summary,
          pattern,
        ),
      ),
    );
  }

  /**
   * Consultas simples y limitadas para evitar que
   * el pooler cancele la página por statement_timeout.
   */
  const leadRows = await db
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
      requiresHuman:
        leads.requiresHuman,
      consentAccepted:
        leads.consentAccepted,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .where(
      conditions.length > 0
        ? and(...conditions)
        : undefined,
    )
    .orderBy(
      desc(leads.requiresHuman),
      desc(leads.createdAt),
    )
    .limit(200);

  const leadIds = leadRows.map(
    (lead) => lead.id,
  );

  const conversationRows =
    leadIds.length > 0
      ? await db
          .select({
            leadId:
              conversations.leadId,
            updatedAt:
              conversations.updatedAt,
          })
          .from(conversations)
          .where(
            inArray(
              conversations.leadId,
              leadIds,
            ),
          )
          .orderBy(
            desc(
              conversations.updatedAt,
            ),
          )
      : [];

  const conversationStats =
    new Map<
      number,
      {
        count: number;
        lastAt: Date | null;
      }
    >();

  for (
    const conversation of
      conversationRows
  ) {
    if (
      conversation.leadId === null
    ) {
      continue;
    }

    const current =
      conversationStats.get(
        conversation.leadId,
      );

    if (!current) {
      conversationStats.set(
        conversation.leadId,
        {
          count: 1,
          lastAt:
            conversation.updatedAt,
        },
      );

      continue;
    }

    current.count += 1;
  }

  const allLeads = await db
    .select({
      status: leads.status,
      requiresHuman:
        leads.requiresHuman,
    })
    .from(leads)
    .limit(5000);

  const totalLeads = allLeads.length;

  const newLeads = allLeads.filter(
    (lead) => lead.status === "NUEVO",
  ).length;

  const humanAttention = allLeads.filter(
    (lead) => lead.requiresHuman,
  ).length;

  const convertedLeads =
    allLeads.filter(
      (lead) =>
        lead.status ===
        "CONVERTIDO",
    ).length;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Asistente comercial
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Leads y conversaciones
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Revisa los contactos capturados
              con consentimiento, identifica
              solicitudes prioritarias y abre
              su historial de conversación.
            </p>
          </div>

          <Link
            href="/crm"
            className="inline-flex rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Volver a pedidos
          </Link>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Leads registrados
            </p>
            <p className="mt-3 text-3xl font-black text-slate-950">
              {totalLeads}
            </p>
          </article>

          <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Nuevos
            </p>
            <p className="mt-3 text-3xl font-black text-blue-700">
              {newLeads}
            </p>
          </article>

          <article className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Requieren atención
            </p>
            <p className="mt-3 text-3xl font-black text-rose-700">
              {humanAttention}
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Convertidos
            </p>
            <p className="mt-3 text-3xl font-black text-emerald-700">
              {convertedLeads}
            </p>
          </article>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form
            action="/crm/leads"
            method="get"
            className="grid gap-4 lg:grid-cols-[1fr_220px_auto]"
          >
            <label className="text-sm font-bold text-slate-700">
              Buscar
              <input
                type="search"
                name="q"
                defaultValue={query}
                maxLength={120}
                placeholder="Nombre, teléfono, correo o interés"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Estado
              <select
                name="status"
                defaultValue={
                  selectedStatus
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">
                  Todos
                </option>

                {LEAD_STATUSES.map(
                  (status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {
                        leadStatusLabels[
                          status
                        ]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800"
              >
                Filtrar
              </button>

              <Link
                href="/crm/leads"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </Link>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">
              Bandeja comercial
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Las solicitudes de atención
              humana aparecen primero.
            </p>
          </div>

          {leadRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                💬
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No existen leads con estos
                filtros
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Los visitantes aparecerán aquí
                cuando compartan sus datos y
                acepten su almacenamiento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Contacto
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Interés
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Estado
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Conversaciones
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actividad
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {leadRows.map((lead) => {
                    const status =
                      getLeadStatus(
                        lead.status,
                      );

                    const stats =
                      conversationStats.get(
                        lead.id,
                      );

                    return (
                      <tr
                        key={lead.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            {lead.requiresHuman && (
                              <span
                                title="Requiere atención humana"
                                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500"
                              />
                            )}

                            <div>
                              <p className="font-bold text-slate-900">
                                {readableValue(
                                  lead.name,
                                  "Visitante",
                                )}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {readableValue(
                                  lead.phone,
                                  lead.email ||
                                    "Sin teléfono",
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {lead.source}
                                {" · "}
                                {lead.consentAccepted
                                  ? "Consentimiento aceptado"
                                  : "Sin consentimiento"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="max-w-sm px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {readableValue(
                              lead.interest,
                              "Sin clasificar",
                            )}
                          </p>

                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                            {readableValue(
                              lead.summary,
                              "Sin resumen",
                            )}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${leadStatusStyles[status]}`}
                          >
                            {
                              leadStatusLabels[
                                status
                              ]
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {stats?.count ?? 0}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            stats?.lastAt ||
                              lead.updatedAt,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <Link
                            href={`/crm/leads/${lead.publicId}`}
                            className="inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}