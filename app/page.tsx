import type { CSSProperties } from "react";

import Image from "next/image";
import {
  and,
  asc,
  eq,
} from "drizzle-orm";
import { connection } from "next/server";

import AssistantChat from "@/components/landing/AssistantChat";
import OrderForm from "@/components/landing/OrderForm";
import { db } from "@/lib/db";
import {
  businessSettings,
  deliveryZones,
  offers,
  products,
} from "@/lib/schema";

export default async function HomePage() {
  await connection();

  const [settings] = await db
    .select({
      businessName:
        businessSettings.businessName,
      legalName:
        businessSettings.legalName,
      phone: businessSettings.phone,
      whatsappNumber:
        businessSettings.whatsappNumber,
      logoUrl: businessSettings.logoUrl,
      primaryColor:
        businessSettings.primaryColor,
      secondaryColor:
        businessSettings.secondaryColor,
      darkColor:
        businessSettings.darkColor,
      freeDeliveryCity:
        businessSettings.freeDeliveryCity,
    })
    .from(businessSettings)
    .where(
      eq(
        businessSettings.code,
        "plastimad",
      ),
    )
    .limit(1);

  const [product] = await db
    .select({
      id: products.id,
      name: products.name,
      shortDescription:
        products.shortDescription,
      description: products.description,
    })
    .from(products)
    .where(
      and(
        eq(
          products.slug,
          "eco-maceta-cnc",
        ),
        eq(products.active, true),
      ),
    )
    .limit(1);

  const offerRows = product
    ? await db
        .select({
          id: offers.id,
          name: offers.name,
          quantity: offers.quantity,
          priceCents: offers.priceCents,
          featured: offers.featured,
        })
        .from(offers)
        .where(
          and(
            eq(
              offers.productId,
              product.id,
            ),
            eq(offers.active, true),
          ),
        )
        .orderBy(asc(offers.sortOrder))
    : [];

  const zoneRows = await db
    .select({
      id: deliveryZones.id,
      code: deliveryZones.code,
      name: deliveryZones.name,
      deliveryType:
        deliveryZones.deliveryType,
      deliveryFeeCents:
        deliveryZones.deliveryFeeCents,
      freeDelivery:
        deliveryZones.freeDelivery,
      requiresQuote:
        deliveryZones.requiresQuote,
      cashOnDeliveryAvailable:
        deliveryZones.cashOnDeliveryAvailable,
    })
    .from(deliveryZones)
    .where(
      eq(deliveryZones.active, true),
    )
    .orderBy(asc(deliveryZones.id));

  if (!settings || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-2xl font-black text-slate-950">
            Catálogo temporalmente no disponible
          </h1>

          <p className="mt-3 text-slate-600">
            La configuración comercial de Plastimad
            todavía no está completa.
          </p>
        </div>
      </main>
    );
  }

  const brandStyles = {
    "--brand-primary":
      settings.primaryColor,
    "--brand-secondary":
      settings.secondaryColor,
    "--brand-dark":
      settings.darkColor,
  } as CSSProperties;

  const logoSource =
    settings.logoUrl ||
    "/plastimad/logo.png";

  const startingPrice =
    offerRows.length > 0
      ? Math.min(
          ...offerRows.map(
            (offer) => offer.priceCents,
          ),
        )
      : 0;

  return (
    <main
      style={brandStyles}
      className="min-h-screen bg-white text-slate-950"
    >
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <a
            href="#inicio"
            className="flex items-center gap-3"
          >
            <Image
              src={logoSource}
              alt={settings.businessName}
              width={240}
              height={80}
              priority
              unoptimized
              className="h-14 w-auto max-w-48 object-contain"
            />
          </a>

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-700 md:flex">
            <a
              className="transition hover:text-[var(--brand-primary)]"
              href="#beneficios"
            >
              Beneficios
            </a>

            <a
              className="transition hover:text-[var(--brand-primary)]"
              href="#producto"
            >
              Producto
            </a>

            <a
              className="transition hover:text-[var(--brand-primary)]"
              href="#comprar"
            >
              Comprar
            </a>
          </nav>

          <a
            href="#comprar"
            className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-[var(--brand-dark)]"
          >
            Comprar ahora
          </a>
        </div>
      </header>

      <section
        id="inicio"
        className="relative isolate overflow-hidden bg-slate-950"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1800&q=85')",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-emerald-950/30" />

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Fabricación sostenible en Ecuador
            </span>

            <h1 className="mt-7 text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Diseño que transforma plástico en
              espacios con vida.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200">
              Conoce la {product.name}, una solución
              funcional y sostenible fabricada con
              plástico reciclado para interiores,
              terrazas y exteriores.
            </p>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                href="#comprar"
                className="rounded-xl bg-[var(--brand-primary)] px-7 py-4 text-center text-base font-black text-white shadow-xl transition hover:bg-[var(--brand-dark)]"
              >
                Comprar desde{" "}
                {new Intl.NumberFormat("es-EC", {
                  style: "currency",
                  currency: "USD",
                }).format(
                  startingPrice / 100,
                )}
              </a>

              <a
                href={`https://wa.me/${settings.whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/30 bg-white/10 px-7 py-4 text-center text-base font-black text-white backdrop-blur transition hover:bg-white/20"
              >
                Consultar por WhatsApp
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4 text-sm font-semibold text-slate-200">
              <span>✓ Entrega gratis en Quito</span>
              <span>✓ Pago contraentrega</span>
              <span>✓ Compra sin registro</span>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-7 backdrop-blur-xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">
                Oferta de lanzamiento
              </p>

              <h2 className="mt-4 text-3xl font-black text-white">
                Hasta 3 Eco Macetas por pedido
              </h2>

              <p className="mt-4 leading-7 text-slate-200">
                Elige el combo que mejor se adapte
                a tu hogar, jardín o proyecto.
              </p>

              <div className="mt-7 space-y-3">
                {offerRows.map((offer) => (
                  <div
                    key={offer.id}
                    className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-white"
                  >
                    <span className="font-bold">
                      {offer.name}
                    </span>

                    <span className="font-black text-emerald-300">
                      {new Intl.NumberFormat(
                        "es-EC",
                        {
                          style: "currency",
                          currency: "USD",
                        },
                      ).format(
                        offer.priceCents / 100,
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="beneficios"
        className="py-20"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
              Por qué elegir Plastimad
            </p>

            <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              Material durable, diseño funcional y
              menor impacto ambiental
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: "♻",
                title: "Plástico reciclado",
                text: "Transformamos material recuperado en productos útiles y durables.",
              },
              {
                icon: "☀",
                title: "Uso interior y exterior",
                text: "Pensada para hogares, terrazas, jardines y proyectos comerciales.",
              },
              {
                icon: "✓",
                title: "Fácil mantenimiento",
                text: "Una solución práctica para espacios que necesitan resistencia y limpieza sencilla.",
              },
              {
                icon: "🚚",
                title: `Entrega en ${settings.freeDeliveryCity}`,
                text: "Entrega local gratuita y coordinación de envíos a provincias.",
              },
            ].map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl text-[var(--brand-primary)]">
                  {benefit.icon}
                </div>

                <h3 className="mt-5 text-lg font-black">
                  {benefit.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {benefit.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="producto"
        className="bg-slate-950 py-20 text-white"
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-2">
            <div
              className="min-h-[520px] rounded-3xl bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=1400&q=85')",
              }}
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <div
                className="min-h-60 rounded-3xl bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=85')",
                }}
              />

              <div className="rounded-3xl bg-[var(--brand-secondary)] p-7">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/80">
                  Producto ecuatoriano
                </p>

                <h3 className="mt-4 text-3xl font-black">
                  {product.name}
                </h3>

                <p className="mt-5 leading-7 text-white/90">
                  {product.description ||
                    product.shortDescription}
                </p>
              </div>

              <div className="rounded-3xl bg-[var(--brand-dark)] p-7 sm:col-span-2">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-200">
                  Compra simple
                </p>

                <h3 className="mt-4 text-3xl font-black">
                  Registra tu pedido en menos de
                  un minuto
                </h3>

                <p className="mt-5 max-w-2xl leading-7 text-emerald-50/90">
                  Selecciona el combo, completa
                  los datos de entrega y continúa
                  por WhatsApp con el resumen listo.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-400">
            Imágenes referenciales temporales. Serán
            reemplazadas por fotografías oficiales
            de Plastimad.
          </p>
        </div>
      </section>

      <OrderForm
        productName={product.name}
        offers={offerRows}
        zones={zoneRows}
        whatsappNumber={
          settings.whatsappNumber
        }
      />

      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
            Compra con acompañamiento
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            Tu pedido queda registrado antes de
            continuar por WhatsApp
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-600">
            Plastimad recibe automáticamente la
            información de compra, dirección y forma
            de entrega. El equipo continúa únicamente
            con la confirmación y logística.
          </p>

          <a
            href="#comprar"
            className="mt-8 inline-flex rounded-xl bg-[var(--brand-primary)] px-7 py-4 font-black text-white transition hover:bg-[var(--brand-dark)]"
          >
            Realizar pedido
          </a>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-2 md:items-center lg:px-8">
          <div>
            <Image
              src={logoSource}
              alt={settings.businessName}
              width={280}
              height={96}
              unoptimized
              className="h-16 w-auto max-w-56 object-contain"
            />

            <p className="mt-4 text-sm text-slate-500">
              {settings.legalName}
            </p>
          </div>

          <div className="md:text-right">
            <p className="font-bold text-slate-900">
              Atención comercial
            </p>

            <a
              href={`https://wa.me/${settings.whatsappNumber}`}
              className="mt-2 inline-block text-[var(--brand-primary)] hover:underline"
            >
              {settings.phone}
            </a>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Los datos ingresados se utilizan
              exclusivamente para registrar y
              coordinar el pedido.
            </p>
          </div>
        </div>
      </footer>

      <AssistantChat
        businessName={settings.businessName}
        whatsappNumber={
          settings.whatsappNumber
        }
      />
    </main>
  );
}