import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import {
  customers,
  deliveryZones,
  offers,
  orders,
  orderStatusHistory,
  products,
  productVariants,
} from "@/lib/schema";
import {
  isOrderStatus,
  statusLabels,
  statusStyles,
  type OrderStatus,
} from "@/lib/orders/status";

import StatusUpdateForm from "./StatusUpdateForm";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatMoney(
  cents: number | null,
) {
  if (cents === null) {
    return "No disponible";
  }

  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readableValue(
  value: string | null,
) {
  return value?.trim() || "No registrado";
}

function toWhatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("593")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `593${digits.slice(1)}`;
  }

  return digits;
}

function getHistoryStatusLabel(
  status: string | null,
) {
  if (!status) {
    return "Inicio";
  }

  if (isOrderStatus(status)) {
    return statusLabels[status];
  }

  return status;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  await connection();

  const { id } = await params;
  const orderId = Number(id);

  if (
    !Number.isInteger(orderId) ||
    orderId < 1
  ) {
    notFound();
  }

  const [order] = await db
    .select({
      id: orders.id,

      customerName: customers.name,
      phone: customers.phone,
      email: customers.email,

      productText: orders.product,
      productName: products.name,
      offerName: offers.name,
      variantName: productVariants.name,
      quantity: orders.quantity,

      zoneName: deliveryZones.name,
      deliveryType: orders.deliveryType,

      province: orders.province,
      city: orders.city,
      sector: orders.sector,
      address: orders.address,
      reference: orders.reference,
      notes: orders.notes,

      status: orders.status,

      subtotalCents: orders.subtotalCents,
      deliveryFeeCents:
        orders.deliveryFeeCents,
      total: orders.total,

      paymentMethod: orders.paymentMethod,
      paymentStatus: orders.paymentStatus,

      source: orders.source,
      utmSource: orders.utmSource,
      utmMedium: orders.utmMedium,
      utmCampaign: orders.utmCampaign,
      utmContent: orders.utmContent,

      attemptCount: orders.attemptCount,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(
      customers,
      eq(orders.customerId, customers.id),
    )
    .leftJoin(
      products,
      eq(orders.productId, products.id),
    )
    .leftJoin(
      offers,
      eq(orders.offerId, offers.id),
    )
    .leftJoin(
      productVariants,
      eq(
        orders.variantId,
        productVariants.id,
      ),
    )
    .leftJoin(
      deliveryZones,
      eq(orders.zoneId, deliveryZones.id),
    )
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    notFound();
  }

  const history = await db
    .select({
      id: orderStatusHistory.id,
      previousStatus:
        orderStatusHistory.previousStatus,
      newStatus:
        orderStatusHistory.newStatus,
      note: orderStatusHistory.note,
      changedByEmail:
        orderStatusHistory.changedByEmail,
      createdAt:
        orderStatusHistory.createdAt,
    })
    .from(orderStatusHistory)
    .where(
      eq(
        orderStatusHistory.orderId,
        orderId,
      ),
    )
    .orderBy(
      desc(orderStatusHistory.createdAt),
    );

  const currentStatus: OrderStatus =
    isOrderStatus(order.status)
      ? order.status
      : "RECIBIDO";

  const location = [
    order.province,
    order.city,
  ]
    .filter(Boolean)
    .join(" - ");

  const marketingOrigin = [
    order.utmSource,
    order.utmMedium,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <main className="px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/crm"
              className="text-sm font-bold text-emerald-700 hover:underline"
            >
              ← Volver a pedidos
            </Link>

            <h1 className="mt-3 text-3xl font-black text-slate-950">
              Pedido #{order.id}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Creado el {formatDate(order.createdAt)}
            </p>
          </div>

          <span
            className={`inline-flex self-start rounded-full border px-4 py-2 text-sm font-bold ${statusStyles[currentStatus]}`}
          >
            {statusLabels[currentStatus]}
          </span>
        </header>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                  Cliente
                </h2>

                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-slate-500">
                      Nombre
                    </dt>

                    <dd className="mt-1 font-bold text-slate-950">
                      {order.customerName}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Teléfono
                    </dt>

                    <dd className="mt-1">
                      <a
                        href={`https://wa.me/${toWhatsappNumber(
                          order.phone,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        {order.phone}
                      </a>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Correo
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900">
                      {readableValue(order.email)}
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                  Producto
                </h2>

                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-slate-500">
                      Producto
                    </dt>

                    <dd className="mt-1 font-bold text-slate-950">
                      {order.productName ||
                        order.productText}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Combo
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900">
                      {order.offerName ||
                        `${order.quantity} unidades`}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Cantidad
                    </dt>

                    <dd className="mt-1 font-bold text-slate-950">
                      {order.quantity}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Variante o color
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900">
                      {readableValue(
                        order.variantName,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Información de entrega
              </h2>

              <div className="mt-5 grid gap-5 text-sm md:grid-cols-2">
                <div>
                  <p className="text-slate-500">
                    Modalidad
                  </p>

                  <p className="mt-1 font-bold text-slate-950">
                    {order.zoneName ||
                      order.deliveryType}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Provincia y ciudad
                  </p>

                  <p className="mt-1 font-bold text-slate-950">
                    {readableValue(location || null)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Sector
                  </p>

                  <p className="mt-1 font-bold text-slate-950">
                    {readableValue(order.sector)}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500">
                    Intentos de entrega
                  </p>

                  <p className="mt-1 font-bold text-slate-950">
                    {order.attemptCount}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-slate-500">
                    Dirección
                  </p>

                  <p className="mt-1 font-bold text-slate-950">
                    {order.address}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-slate-500">
                    Referencia
                  </p>

                  <p className="mt-1 leading-6 text-slate-900">
                    {readableValue(order.reference)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-slate-500">
                    Observaciones del comprador
                  </p>

                  <p className="mt-1 leading-6 text-slate-900">
                    {readableValue(order.notes)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-5 md:grid-cols-2">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                  Pago
                </h2>

                <dl className="mt-5 space-y-4 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">
                      Método
                    </dt>

                    <dd className="font-bold text-slate-950">
                      {order.paymentMethod}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">
                      Estado
                    </dt>

                    <dd className="font-bold text-slate-950">
                      {order.paymentStatus}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">
                      Subtotal
                    </dt>

                    <dd className="font-bold text-slate-950">
                      {formatMoney(
                        order.subtotalCents,
                      )}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">
                      Envío
                    </dt>

                    <dd className="font-bold text-slate-950">
                      {formatMoney(
                        order.deliveryFeeCents,
                      )}
                    </dd>
                  </div>

                  <div className="flex justify-between gap-4 border-t border-slate-200 pt-4">
                    <dt className="font-black text-slate-950">
                      Total
                    </dt>

                    <dd className="text-xl font-black text-emerald-700">
                      {formatMoney(order.total)}
                    </dd>
                  </div>
                </dl>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                  Marketing
                </h2>

                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-slate-500">
                      Origen
                    </dt>

                    <dd className="mt-1 font-bold text-slate-950">
                      {order.source}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Fuente / medio
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900">
                      {readableValue(
                        marketingOrigin || null,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Campaña
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900">
                      {readableValue(
                        order.utmCampaign,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Contenido
                    </dt>

                    <dd className="mt-1 font-medium text-slate-900">
                      {readableValue(
                        order.utmContent,
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Historial de estados
              </h2>

              {history.length === 0 ? (
                <p className="mt-5 text-sm text-slate-500">
                  Todavía no existen movimientos
                  registrados.
                </p>
              ) : (
                <div className="mt-6 space-y-5">
                  {history.map((entry) => (
                    <article
                      key={entry.id}
                      className="relative border-l-2 border-emerald-200 pl-5"
                    >
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-emerald-600" />

                      <p className="font-bold text-slate-950">
                        {entry.previousStatus
                          ? `${getHistoryStatusLabel(
                              entry.previousStatus,
                            )} → ${getHistoryStatusLabel(
                              entry.newStatus,
                            )}`
                          : getHistoryStatusLabel(
                              entry.newStatus,
                            )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(entry.createdAt)}
                        {" · "}
                        {entry.changedByEmail}
                      </p>

                      {entry.note && (
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {entry.note}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="xl:sticky xl:top-6 xl:self-start">
            <StatusUpdateForm
              orderId={order.id}
              currentStatus={currentStatus}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}