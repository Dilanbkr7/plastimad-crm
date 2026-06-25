import { db } from "@/lib/db";
import { customers, orders } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";

/**
 * Colores visuales para cada etapa del pipeline.
 *
 * El objeto puede ampliarse cuando agreguemos
 * nuevos estados al proceso de entregas.
 */
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

/**
 * Convierte los estados técnicos en textos
 * más claros para los usuarios del CRM.
 */
const statusLabels: Record<string, string> = {
  RECIBIDO: "Pedido recibido",
  PEDIDO_RECIBIDO: "Pedido recibido",
  CONFIRMADO: "Confirmado",
  PROGRAMADO: "Programado",
  EN_RUTA: "En ruta",
  ENTREGADO_COBRADO: "Entregado y cobrado",
  REPROGRAMAR: "Reprogramar",
  NOVEDAD: "Novedad",
  CANCELADO: "Cancelado",
};

/**
 * Convierte centavos a dólares.
 *
 * Ejemplo:
 * 2000 → USD 20,00
 */
function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Presenta la fecha de PostgreSQL
 * en un formato entendible para Ecuador.
 */
function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Devuelve el estilo correspondiente
 * al estado actual del pedido.
 */
function getStatusStyle(status: string) {
  return (
    statusStyles[status] ??
    "border-slate-300 bg-slate-100 text-slate-600"
  );
}

/**
 * Página principal del CRM.
 *
 * Se ejecuta en el servidor y consulta directamente
 * las tablas customers y orders.
 */
export default async function CRMPage() {
  /**
   * Indica a Next.js que esta página debe
   * renderizarse al recibir cada solicitud.
   *
   * Así evitamos que el listado de pedidos quede
   * congelado durante la compilación.
   */
  await connection();

  /**
   * Une orders con customers.
   *
   * Esto permite mostrar en una misma fila:
   * - datos del pedido;
   * - nombre del cliente;
   * - teléfono del cliente.
   */
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
      eq(orders.customerId, customers.id),
    )
    .orderBy(desc(orders.createdAt));

  /**
   * Métricas iniciales del panel.
   */
  const totalOrders = orderRows.length;

  const receivedOrders = orderRows.filter(
    (order) =>
      order.status === "RECIBIDO" ||
      order.status === "PEDIDO_RECIBIDO",
  ).length;

  const pendingOrders = orderRows.filter(
    (order) =>
      order.status !== "ENTREGADO_COBRADO" &&
      order.status !== "CANCELADO",
  ).length;

  const totalOrderValue = orderRows.reduce(
    (accumulator, order) => accumulator + order.total,
    0,
  );

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Encabezado */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Plastimad del Ecuador
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Control de pedidos
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Seguimiento centralizado de clientes, pedidos y
              entregas.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver landing
            </a>

            <a
              href="/crm"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Actualizar pedidos
            </a>
          </div>
        </header>

        {/* Métricas */}
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
              {formatMoney(totalOrderValue)}
            </p>
          </article>
        </section>

        {/* Tabla de pedidos */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-950">
              Pedidos recientes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Los pedidos más recientes aparecen primero.
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
                Realiza un pedido de prueba mediante la API.
                Cuando se registre, aparecerá automáticamente
                en este panel.
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
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {orderRows.map((order) => (
                    <tr
                      key={order.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-bold text-slate-900">
                          #{order.id}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {order.customerName}
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
                          Cantidad: {order.quantity}
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
                          {statusLabels[order.status] ??
                            order.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-bold text-slate-900">
                        {formatMoney(order.total)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-6 text-center text-xs text-slate-500">
          Plastimad CRM · Datos almacenados en PostgreSQL
        </footer>
      </div>
    </main>
  );
}