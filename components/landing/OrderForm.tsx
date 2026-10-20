"use client";

import type { FormEvent } from "react";
import {
  useMemo,
  useRef,
  useState,
} from "react";

import { createWhatsAppUrl } from "@/lib/whatsapp";
import { trackLead } from "@/lib/tracking";
import { validateBillingDocument, type BillingDocumentType } from "@/lib/orders/billing";

type LandingOffer = {
  id: number;
  name: string;
  quantity: number;
  priceCents: number;
  featured: boolean;
};

type LandingZone = {
  id: number;
  code: string;
  name: string;
  deliveryType: string;
  deliveryFeeCents: number;
  freeDelivery: boolean;
  requiresQuote: boolean;
  cashOnDeliveryAvailable: boolean;
};

type OrderFormProps = {
  productName: string;
  offers: LandingOffer[];
  zones: LandingZone[];
  whatsappNumber: string;
};

type OrderApiResponse = {
  ok: boolean;
  message: string;
  data?: {
    order: {
      id: number;
      product: string;
      quantity: number;
      address: string;
      province: string | null;
      city: string | null;
      sector: string | null;
      reference: string | null;
      paymentMethod: string;
      total: number;
    };
    offer: {
      id: number;
      name: string;
      quantity: number;
      priceCents: number;
    };
    delivery: {
      zoneId: number;
      zoneName: string;
      type: string;
      feeCents: number;
      freeDelivery: boolean;
      shippingQuoteRequired: boolean;
    };
    pricing: {
      subtotalCents: number;
      deliveryFeeCents: number;
      totalCents: number;
    };
  };
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-emerald-100";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function detectSource(searchParams: URLSearchParams) {
  const source = (
    searchParams.get("utm_source") ?? ""
  ).toLowerCase();

  if (
    source.includes("facebook") ||
    source.includes("instagram") ||
    source.includes("meta")
  ) {
    return "META";
  }

  if (source.includes("tiktok")) {
    return "TIKTOK";
  }

  if (source.includes("whatsapp")) {
    return "WHATSAPP";
  }

  return "DIRECTO";
}

export default function OrderForm({
  productName,
  offers,
  zones,
  whatsappNumber,
}: OrderFormProps) {
  const availableZones = useMemo(() => zones.filter((zone) => zone.cashOnDeliveryAvailable), [zones]);
  const featuredOffer =
    offers.find((offer) => offer.featured) ??
    offers[0];

  const initialZone =
    availableZones.find((zone) => zone.code === "quito-local") ??
    availableZones[0];

  const [selectedOfferId, setSelectedOfferId] =
    useState<number>(featuredOffer?.id ?? 0);

  const [selectedZoneId, setSelectedZoneId] =
    useState<number>(initialZone?.id ?? 0);

  const paymentMethod = "CONTRAENTREGA";
  const [billingDocumentType, setBillingDocumentType] = useState<BillingDocumentType | "">("");

  const [province, setProvince] =
    useState(
      initialZone?.code === "quito-local"
        ? "Pichincha"
        : "",
    );

  const [city, setCity] =
    useState(
      initialZone?.code === "quito-local"
        ? "Quito"
        : "",
    );

  const [loading, setLoading] = useState(false);
  const pendingRequest = useRef({ body: "", key: "" });
  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedOffer = useMemo(
    () =>
      offers.find(
        (offer) => offer.id === selectedOfferId,
      ),
    [offers, selectedOfferId],
  );

  const selectedZone = useMemo(
    () =>
      availableZones.find(
        (zone) => zone.id === selectedZoneId,
      ),
    [availableZones, selectedZoneId],
  );

  function handleZoneChange(
    nextZoneId: number,
  ) {
    const nextZone = availableZones.find(
      (zone) => zone.id === nextZoneId,
    );

    setSelectedZoneId(nextZoneId);

    if (nextZone?.code === "quito-local") {
      setProvince("Pichincha");
      setCity("Quito");
    } else {
      setProvince("");
      setCity("");
    }

  }

  const displayedDeliveryFee =
    selectedZone?.requiresQuote
      ? null
      : selectedZone?.deliveryFeeCents ?? 0;

  const displayedTotal =
    (selectedOffer?.priceCents ?? 0) +
    (displayedDeliveryFee ?? 0);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (loading) return;
    setErrorMessage("");

    if (!selectedOffer || !selectedZone) {
      setErrorMessage(
        "Selecciona un combo y una modalidad de entrega.",
      );
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData(
        event.currentTarget,
      );
      const billingDocumentNumber = String(formData.get("billingDocumentNumber") ?? "");
      const billingError = validateBillingDocument(billingDocumentType, billingDocumentNumber);
      if (billingError) throw new Error(billingError);

      const currentParams = new URLSearchParams(
        window.location.search,
      );

      const body = {
        name: String(
          formData.get("name") ?? "",
        ),
        phone: String(
          formData.get("phone") ?? "",
        ),
        email: String(
          formData.get("email") ?? "",
        ),
        billingDocumentType,
        billingDocumentNumber,

        offerId: selectedOffer.id,
        zoneId: selectedZone.id,

        province,
        city,
        sector: String(
          formData.get("sector") ?? "",
        ),
        address: String(
          formData.get("address") ?? "",
        ),
        reference: String(
          formData.get("reference") ?? "",
        ),
        notes: String(
          formData.get("notes") ?? "",
        ),

        paymentMethod,
        source: detectSource(currentParams),

        utmSource:
          currentParams.get("utm_source") ?? "",
        utmMedium:
          currentParams.get("utm_medium") ?? "",
        utmCampaign:
          currentParams.get("utm_campaign") ?? "",
        utmContent:
          currentParams.get("utm_content") ?? "",
      };

      const encodedBody = JSON.stringify(body);
      if (pendingRequest.current.body !== encodedBody) {
        pendingRequest.current = { body: encodedBody, key: crypto.randomUUID() };
      }
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": pendingRequest.current.key,
        },
        body: encodedBody,
      });

      const payload =
        (await response.json()) as OrderApiResponse;

      if (
        !response.ok ||
        !payload.ok ||
        !payload.data
      ) {
        throw new Error(
          payload.message ||
            "No se pudo registrar el pedido.",
        );
      }

      const order = payload.data.order;
      trackLead(`order-${order.id}`, "Pedido registrado");
      const delivery = payload.data.delivery;
      const pricing = payload.data.pricing;

      const whatsappMessage = [
        "Hola Plastimad, acabo de realizar un pedido.",
        "",
        `Pedido: #${order.id}`,
        `Cliente: ${body.name}`,
        `Teléfono: ${body.phone}`,
        `Documento de facturación (${billingDocumentType === "CEDULA" ? "Cédula" : "RUC"}): ${billingDocumentNumber}`,
        `Producto: ${productName}`,
        `Combo: ${selectedOffer.name}`,
        `Cantidad: ${selectedOffer.quantity}`,
        `Entrega: ${delivery.zoneName}`,
        `Provincia: ${province}`,
        `Ciudad: ${city}`,
        `Sector: ${body.sector || "No especificado"}`,
        `Dirección: ${body.address}`,
        `Referencia: ${
          body.reference || "No especificada"
        }`,
        `Método de pago: ${paymentMethod}`,
        `Subtotal: ${formatMoney(
          pricing.subtotalCents,
        )}`,
        delivery.shippingQuoteRequired
          ? "Envío: tarifa por confirmar"
          : `Envío: ${formatMoney(
              pricing.deliveryFeeCents,
            )}`,
        `Total: ${formatMoney(
          pricing.totalCents,
        )}`,
        "",
        "Deseo continuar con la coordinación de mi entrega.",
      ].join("\n");

      const whatsappUrl = createWhatsAppUrl(
        whatsappNumber,
        whatsappMessage,
      );

      if (!whatsappUrl) {
        throw new Error(
          "El número empresarial de WhatsApp no está configurado correctamente.",
        );
      }

      window.location.assign(whatsappUrl);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo registrar el pedido.";

      setErrorMessage(message);
      setLoading(false);
    }
  }

  if (
    offers.length === 0 ||
    availableZones.length === 0
  ) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Por el momento no hay ofertas o zonas disponibles para pago contraentrega.
        Comunícate directamente con Plastimad.
      </section>
    );
  }

  return (
    <section
      id="comprar"
      className="scroll-mt-24 bg-slate-50 py-20"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand-primary)]">
            Compra directa
          </p>

          <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Elige tu combo y registra tu entrega
          </h2>

          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            Tu pedido se registra automáticamente
            en Plastimad y después continuarás por
            WhatsApp con el resumen completo.
          </p>

          <div className="mt-8 space-y-4">
            {offers.map((offer) => {
              const selected =
                offer.id === selectedOfferId;

              return (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() =>
                    setSelectedOfferId(offer.id)
                  }
                  className={`relative w-full rounded-2xl border p-5 text-left transition ${
                    selected
                      ? "border-[var(--brand-primary)] bg-emerald-50 shadow-md ring-2 ring-emerald-100"
                      : "border-slate-200 bg-white hover:border-emerald-300"
                  }`}
                >
                  {offer.featured && (
                    <span className="absolute right-4 top-4 rounded-full bg-[var(--brand-secondary)] px-3 py-1 text-xs font-bold text-white">
                      Más elegido
                    </span>
                  )}

                  <p className="pr-24 text-lg font-bold text-slate-950">
                    {offer.name}
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    {offer.quantity}{" "}
                    {offer.quantity === 1
                      ? "unidad"
                      : "unidades"}
                  </p>

                  <p className="mt-4 text-3xl font-black text-[var(--brand-dark)]">
                    {formatMoney(
                      offer.priceCents,
                    )}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-5">
            <p className="text-sm font-semibold text-slate-500">
              Resumen provisional
            </p>

            <div className="mt-3 flex items-center justify-between gap-4">
              <span className="text-slate-700">
                Producto
              </span>

              <span className="font-bold text-slate-950">
                {selectedOffer?.name}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="text-slate-700">
                Entrega
              </span>

              <span className="text-right font-bold text-slate-950">
                {selectedZone?.requiresQuote
                  ? "Por confirmar"
                  : formatMoney(
                      selectedZone?.deliveryFeeCents ??
                        0,
                    )}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="font-bold text-slate-950">
                Total
              </span>

              <span className="text-2xl font-black text-[var(--brand-primary)]">
                {selectedZone?.requiresQuote
                  ? `${formatMoney(
                      selectedOffer?.priceCents ??
                        0,
                    )} + envío`
                  : formatMoney(displayedTotal)}
              </span>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
              Datos de entrega y facturación
            </p>

            <h3 className="mt-3 text-2xl font-black text-slate-950">
              Completa tu pedido
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              No necesitas crear una cuenta ni ingresar
              datos de tarjeta.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Nombre completo *
              <input
                className={inputClass}
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                placeholder="Ej. Juan Pérez"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Teléfono / WhatsApp *
              <input
                className={inputClass}
                name="phone"
                type="tel"
                required
                minLength={9}
                maxLength={20}
                autoComplete="tel"
                inputMode="tel"
                placeholder="0999999999"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Documento de facturación *
              <select
                className={inputClass}
                name="billingDocumentType"
                required
                value={billingDocumentType}
                onChange={(event) => setBillingDocumentType(event.target.value as BillingDocumentType | "")}
              >
                <option value="" disabled>Selecciona cédula o RUC</option>
                <option value="CEDULA">Cédula</option>
                <option value="RUC">RUC</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              {billingDocumentType === "RUC" ? "Número de RUC" : billingDocumentType === "CEDULA" ? "Número de cédula" : "Número de documento"} *
              <input
                className={inputClass}
                name="billingDocumentNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                required
                disabled={!billingDocumentType}
                minLength={billingDocumentType === "RUC" ? 13 : 10}
                maxLength={billingDocumentType === "RUC" ? 13 : 10}
                pattern={billingDocumentType === "RUC" ? "[0-9]{13}" : "[0-9]{10}"}
                title={billingDocumentType === "RUC" ? "Ingresa los 13 dígitos del RUC, sin espacios ni guiones." : "Ingresa los 10 dígitos de la cédula, sin espacios ni guiones."}
                placeholder={billingDocumentType === "RUC" ? "13 dígitos" : billingDocumentType === "CEDULA" ? "10 dígitos" : "Selecciona primero el documento"}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Correo electrónico
              <input
                className={inputClass}
                name="email"
                type="email"
                maxLength={255}
                autoComplete="email"
                placeholder="Opcional"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Modalidad de entrega *
              <select
                className={inputClass}
                value={selectedZoneId}
                onChange={(event) =>
                  handleZoneChange(
                    Number(event.target.value),
                  )
                }
              >
                {availableZones.map((zone) => (
                  <option
                    key={zone.id}
                    value={zone.id}
                  >
                    {zone.name}
                  </option>
                ))}
              </select>
              <span className="mt-2 block text-xs font-normal text-slate-500">
                Solo se muestran zonas con pago contraentrega disponible.
              </span>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Provincia *
              <input
                className={inputClass}
                name="province"
                type="text"
                required
                maxLength={100}
                value={province}
                onChange={(event) =>
                  setProvince(event.target.value)
                }
                readOnly={
                  selectedZone?.code ===
                  "quito-local"
                }
                placeholder="Ej. Pichincha"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Ciudad *
              <input
                className={inputClass}
                name="city"
                type="text"
                required
                maxLength={100}
                value={city}
                onChange={(event) =>
                  setCity(event.target.value)
                }
                readOnly={
                  selectedZone?.code ===
                  "quito-local"
                }
                placeholder="Ej. Quito"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Sector
              <input
                className={inputClass}
                name="sector"
                type="text"
                maxLength={150}
                placeholder="Ej. Quito Norte"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Dirección completa *
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                name="address"
                required
                minLength={5}
                maxLength={500}
                autoComplete="street-address"
                placeholder="Calle principal, numeración e intersección"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Referencia de entrega
              <textarea
                className={`${inputClass} min-h-24 resize-y`}
                name="reference"
                maxLength={500}
                placeholder="Color de la casa, edificio, local o punto de referencia"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Observaciones
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                name="notes"
                maxLength={1000}
                placeholder="Información adicional para Plastimad"
              />
            </label>
          </div>

          <fieldset className="mt-7">
            <legend className="text-sm font-bold text-slate-800">Método de pago</legend>
            <div className="mt-3 rounded-xl border border-[var(--brand-primary)] bg-emerald-50 p-4">
              <p className="font-bold text-slate-900">Contraentrega</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">Paga cuando recibas tu pedido.</p>
            </div>
          </fieldset>

          <label className="mt-7 flex items-start gap-3 text-sm leading-6 text-slate-600">
            <input
              className="mt-1 h-4 w-4 accent-[var(--brand-primary)]"
              type="checkbox"
              required
            />

            <span>
              Autorizo el uso de mis datos para
              registrar, facturar, coordinar y entregar este
              pedido.
            </span>
          </label>

          {errorMessage && (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-[var(--brand-primary)] px-6 py-4 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Registrando pedido..."
              : "Registrar pedido y continuar a WhatsApp"}
          </button>

          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            Tu pedido se guarda antes de abrir
            WhatsApp.
          </p>
        </form>
      </div>
    </section>
  );
}
