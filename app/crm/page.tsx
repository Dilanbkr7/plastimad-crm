import Link from "next/link";
import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, orders } from "@/lib/schema";

const statusStyles: Record<string, string> = {
  RECIBIDO:
    "border-blue-200 bg-blue-50 text-blue-700",
  PEDIDO_RECIBIDO:
    "border-blue-200 bg-blue-50 text-blue-700",
  CONFIRMADO:
    "border-cyan-200 bg-cyan-50 text-cyan-700",
  PROGRAMADO:
    "border-amber-200 bg-amber-50 text-amber-700",
  EN_RUTA:
    "border-violet-200 bg-violet-50 text-violet-700",
  ENTREGADO_COBRADO:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  REPROGRAMAR:
    "border-orange-200 bg-orange-50 text-orange-700",
  NOVEDAD:
    "border-rose-200 bg-rose-50 text-rose-700",
  CANCELADO:
    "border-slate-300 bg-slate-100 text-slate-600",
};

const statusLabels: Record<string, string> = {
  RECIBIDO: "Pedido recibido",
  PEDIDO_RECIBIDO: "Pedido recibido",
  CONFIRMADO: "Confirmado",
  PROGRAMADO: "Programado",
  EN_RUTA: "En ruta",
  ENTREGADO_COBRADO:
    "Entregado y cobrado",
  REPROGRAMAR: "Reprogramar",
  NOVEDAD: "Novedad",
  CANCELADO: "Cancelado",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guayaquil",
  }).format(new Date(value));
}

function getStatusStyle(status: string) {
  return (
    statusStyles[status] ??
    "border-slate-300 bg-slate-100 text-slate-600"
  );
}

export default async function CRMPage() {
  await connection();

  const orderRows = await db
    .select({
      id: orders.id,
      customerId: customers.id,
      customerName: customers.name,
      phone: customers.phone,
      product: orders.product,
      quantity: orders.quantity,
      address: orders.address,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(
      customers,
      eq(
        orders.customerId,
        customers.id,
      ),
    )
    .orderBy(
      desc(orders.createdAt),
    )
    .limit(200);

  const totalOrders = orderRows.length;

  const receivedOrders =
    orderRows.filter(
      (order) =>
        order.status === "RECIBIDO" ||
        order.status ===
          "PEDIDO_RECIBIDO",
    ).length;

  const pendingOrders =
    orderRows.filter(
      (order) =>
        order.status !==
          "ENTREGADO_COBRADO" &&
        order.status !== "CANCELADO",
    ).length;

  const totalOrderValue =
    orderRows.reduce(
      (accumulator, order) =>
        accumulator + order.total,
      0,
    );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Plastimad del Ecuador
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Control de pedidos
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Seguimiento centralizado de
              clientes, pedidos y entregas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver landing
            </Link>

            <Link
              href="/crm/leads"
              className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Ver leads
            </Link>

            <form action="/crm" method="get">
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Actualizar lista
              </button>
            </form>
          </div>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pedidos registrados
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-950">
              {totalOrders}
            </p>
          </article>

          <article className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pedidos recibidos
            </p>

            <p className="mt-3 text-3xl font-bold text-blue-700">
              {receivedOrders}
            </p>
          </article>

          <article className="rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pendientes de cierre
            </p>

            <p className="mt-3 text-3xl font-bold text-amber-700">
              {pendingOrders}
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Valor de pedidos
            </p>

            <p className="mt-3 text-3xl font-bold text-emerald-700">
              {formatMoney(
                totalOrderValue,
              )}
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">
              Pedidos recientes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Pulsa Abrir para revisar y
              actualizar el estado del pedido.
            </p>
          </div>

          {orderRows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
                📦
              </div>

              <h3 className="text-lg font-semibold text-slate-900">
                Todavía no existen pedidos
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Registra un pedido desde la
                landing. Cuando se guarde,
                aparecerá automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Pedido
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cliente
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Producto
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Dirección
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Estado
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Fecha
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {orderRows.map(
                    (order) => (
                      <tr
                        key={order.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <Link
                            href={`/crm/orders/${order.id}`}
                            className="font-bold text-emerald-700 hover:underline"
                          >
                            #{order.id}
                          </Link>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {
                              order.customerName
                            }
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {order.phone}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">
                            {order.product}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Cantidad:{" "}
                            {order.quantity}
                          </p>
                        </td>

                        <td className="max-w-xs px-5 py-4">
                          <p className="line-clamp-2 text-sm text-slate-700">
                            {order.address}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                              order.status,
                            )}`}
                          >
                            {statusLabels[
                              order.status
                            ] ??
                              order.status}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-slate-900">
                          {formatMoney(
                            order.total,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            order.createdAt,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          <Link
                            href={`/crm/orders/${order.id}`}
                            className="inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                          >
                            Abrir
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-6 text-center text-xs text-slate-500">
          Plastimad CRM · Datos almacenados
          en PostgreSQL
        </footer>
      </div>
    </main>
  );
}