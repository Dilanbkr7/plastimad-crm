import { db } from "@/lib/db";
import {
  customers,
  deliveryZones,
  offers,
  orders,
  products,
  productVariants,
} from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * Datos que podrá enviar la futura landing.
 *
 * El navegador no enviará precios.
 * Solo enviará identificadores y datos del comprador.
 * El precio se calculará exclusivamente en el servidor.
 */
type CreateOrderBody = {
  name?: unknown;
  phone?: unknown;
  email?: unknown;

  offerId?: unknown;
  variantId?: unknown;
  zoneId?: unknown;

  province?: unknown;
  city?: unknown;
  sector?: unknown;
  address?: unknown;
  reference?: unknown;
  notes?: unknown;

  paymentMethod?: unknown;
  source?: unknown;

  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
};

const allowedPaymentMethods = new Set([
  "CONTRAENTREGA",
  "TRANSFERENCIA",
  "DEUNA",
  "PAYPHONE",
]);

const allowedSources = new Set([
  "DIRECTO",
  "TIKTOK",
  "META",
  "WHATSAPP",
]);

/**
 * Convierte cualquier valor válido en texto limpio
 * y limita su longitud máxima.
 */
function readText(
  value: unknown,
  maximumLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

/**
 * Normaliza números de Ecuador.
 *
 * Ejemplos:
 * +593 999 936 165 → 0999936165
 * 593999936165     → 0999936165
 * 0999936165       → 0999936165
 */
function normalizePhone(value: unknown): string {
  const digits = readText(value, 30).replace(/\D/g, "");

  if (digits.startsWith("593") && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }

  return digits;
}

/**
 * GET /api/orders
 *
 * Permite comprobar que el endpoint está activo.
 */
export async function GET() {
  return Response.json(
    {
      ok: true,
      message: "API de pedidos de Plastimad funcionando.",
      endpoint: "/api/orders",
      methods: ["GET", "POST"],
      pricing: "database",
    },
    {
      status: 200,
    },
  );
}

/**
 * POST /api/orders
 *
 * Flujo:
 * 1. valida los datos enviados;
 * 2. consulta producto y oferta en PostgreSQL;
 * 3. valida la zona y el método de pago;
 * 4. busca o crea el cliente;
 * 5. registra el pedido en una transacción.
 */
export async function POST(request: Request) {
  let body: CreateOrderBody;

  try {
    body = (await request.json()) as CreateOrderBody;
  } catch {
    return Response.json(
      {
        ok: false,
        message: "El cuerpo de la solicitud no contiene JSON válido.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const name = readText(body.name, 120);
    const phone = normalizePhone(body.phone);
    const email = readText(body.email, 255).toLowerCase();

    const province = readText(body.province, 100);
    const city = readText(body.city, 100);
    const sector = readText(body.sector, 150);
    const address = readText(body.address, 500);
    const reference = readText(body.reference, 500);
    const notes = readText(body.notes, 1000);

    const utmSource = readText(body.utmSource, 120);
    const utmMedium = readText(body.utmMedium, 120);
    const utmCampaign = readText(body.utmCampaign, 180);
    const utmContent = readText(body.utmContent, 180);

    const offerId = Number(body.offerId);
    const zoneId = Number(body.zoneId);

    const variantId =
      body.variantId === null ||
      body.variantId === undefined ||
      body.variantId === ""
        ? null
        : Number(body.variantId);

    const paymentMethodInput = readText(
      body.paymentMethod,
      30,
    ).toUpperCase();

    const paymentMethod = paymentMethodInput || "CONTRAENTREGA";

    const sourceInput = readText(
      body.source,
      50,
    ).toUpperCase();

    const source = sourceInput || "DIRECTO";

    /**
     * Validación del cliente.
     */
    if (name.length < 2) {
      return Response.json(
        {
          ok: false,
          message: "El nombre debe tener al menos 2 caracteres.",
        },
        {
          status: 400,
        },
      );
    }

    if (phone.length < 9 || phone.length > 15) {
      return Response.json(
        {
          ok: false,
          message: "El teléfono ingresado no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return Response.json(
        {
          ok: false,
          message: "El correo electrónico no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Validación comercial y de entrega.
     */
    if (!Number.isInteger(offerId) || offerId < 1) {
      return Response.json(
        {
          ok: false,
          message: "Debes seleccionar un combo válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(zoneId) || zoneId < 1) {
      return Response.json(
        {
          ok: false,
          message: "Debes seleccionar una zona de entrega válida.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      variantId !== null &&
      (!Number.isInteger(variantId) || variantId < 1)
    ) {
      return Response.json(
        {
          ok: false,
          message: "La variante seleccionada no es válida.",
        },
        {
          status: 400,
        },
      );
    }

    if (!province) {
      return Response.json(
        {
          ok: false,
          message: "La provincia es obligatoria.",
        },
        {
          status: 400,
        },
      );
    }

    if (!city) {
      return Response.json(
        {
          ok: false,
          message: "La ciudad es obligatoria.",
        },
        {
          status: 400,
        },
      );
    }

    if (address.length < 5) {
      return Response.json(
        {
          ok: false,
          message: "La dirección debe ser más específica.",
        },
        {
          status: 400,
        },
      );
    }

    if (!allowedPaymentMethods.has(paymentMethod)) {
      return Response.json(
        {
          ok: false,
          message: "El método de pago seleccionado no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    if (!allowedSources.has(source)) {
      return Response.json(
        {
          ok: false,
          message: "El origen comercial del pedido no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Consulta el combo junto con su producto.
     *
     * La landing no puede decidir el precio.
     * El precio se obtiene directamente de la tabla offers.
     */
    const [catalogSelection] = await db
      .select({
        offerId: offers.id,
        offerName: offers.name,
        quantity: offers.quantity,
        priceCents: offers.priceCents,

        productId: products.id,
        productName: products.name,
      })
      .from(offers)
      .innerJoin(
        products,
        eq(offers.productId, products.id),
      )
      .where(
        and(
          eq(offers.id, offerId),
          eq(offers.active, true),
          eq(products.active, true),
        ),
      )
      .limit(1);

    if (!catalogSelection) {
      return Response.json(
        {
          ok: false,
          message: "El combo seleccionado ya no está disponible.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Valida la zona seleccionada.
     */
    const [zone] = await db
      .select({
        id: deliveryZones.id,
        name: deliveryZones.name,
        deliveryType: deliveryZones.deliveryType,
        deliveryFeeCents: deliveryZones.deliveryFeeCents,
        freeDelivery: deliveryZones.freeDelivery,
        requiresQuote: deliveryZones.requiresQuote,
        cashOnDeliveryAvailable:
          deliveryZones.cashOnDeliveryAvailable,
      })
      .from(deliveryZones)
      .where(
        and(
          eq(deliveryZones.id, zoneId),
          eq(deliveryZones.active, true),
        ),
      )
      .limit(1);

    if (!zone) {
      return Response.json(
        {
          ok: false,
          message: "La zona de entrega seleccionada no está disponible.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Impide ofrecer contraentrega donde el servicio
     * todavía no ha sido confirmado.
     *
     * Actualmente:
     * Quito sí permite contraentrega.
     * Provincias todavía no.
     */
    if (
      paymentMethod === "CONTRAENTREGA" &&
      !zone.cashOnDeliveryAvailable
    ) {
      return Response.json(
        {
          ok: false,
          message:
            "La contraentrega todavía no está disponible para esa zona. Selecciona transferencia u otro método habilitado.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Valida que la variante exista, esté activa
     * y pertenezca al producto seleccionado.
     */
    let selectedVariant:
      | {
          id: number;
          name: string;
        }
      | undefined;

    if (variantId !== null) {
      [selectedVariant] = await db
        .select({
          id: productVariants.id,
          name: productVariants.name,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.id, variantId),
            eq(
              productVariants.productId,
              catalogSelection.productId,
            ),
            eq(productVariants.active, true),
          ),
        )
        .limit(1);

      if (!selectedVariant) {
        return Response.json(
          {
            ok: false,
            message:
              "El color o variante seleccionada no está disponible.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /**
     * Para zonas que requieren cotización, el costo
     * del envío se mantiene temporalmente en cero.
     *
     * El sistema devuelve shippingQuoteRequired = true
     * para que la interfaz lo informe claramente.
     */
    const deliveryFeeCents = zone.requiresQuote
      ? 0
      : zone.deliveryFeeCents;

    const subtotalCents = catalogSelection.priceCents;

    const totalInCents =
      subtotalCents + deliveryFeeCents;

    /**
     * Transacción:
     *
     * - busca un cliente por teléfono;
     * - actualiza nombre/correo si ya existe;
     * - crea el cliente si no existe;
     * - registra el pedido.
     *
     * Si alguna operación falla, no se guarda
     * información incompleta.
     */
    const result = await db.transaction(async (transaction) => {
      const [existingCustomer] = await transaction
        .select()
        .from(customers)
        .where(eq(customers.phone, phone))
        .orderBy(desc(customers.id))
        .limit(1);

      let customer = existingCustomer;

      if (existingCustomer) {
        const [updatedCustomer] = await transaction
          .update(customers)
          .set({
            name,
            ...(email ? { email } : {}),
          })
          .where(eq(customers.id, existingCustomer.id))
          .returning();

        customer = updatedCustomer ?? existingCustomer;
      } else {
        const [newCustomer] = await transaction
          .insert(customers)
          .values({
            name,
            phone,
            email: email || null,
          })
          .returning();

        if (!newCustomer) {
          throw new Error("No se pudo crear el cliente.");
        }

        customer = newCustomer;
      }

      if (!customer) {
        throw new Error("No se pudo identificar el cliente.");
      }

      const [order] = await transaction
        .insert(orders)
        .values({
          customerId: customer.id,

          /**
           * Se guarda también el nombre textual para mantener
           * compatibilidad con el CRM actual.
           */
          product: catalogSelection.productName,

          productId: catalogSelection.productId,
          offerId: catalogSelection.offerId,
          variantId: selectedVariant?.id ?? null,
          zoneId: zone.id,

          quantity: catalogSelection.quantity,

          address,
          province,
          city,
          sector: sector || null,
          reference: reference || null,
          notes: notes || null,

          status: "RECIBIDO",

          deliveryType: zone.deliveryType,

          subtotalCents,
          deliveryFeeCents,
          total: totalInCents,

          paymentMethod,
          paymentStatus: "PENDIENTE",

          source,

          utmSource: utmSource || null,
          utmMedium: utmMedium || null,
          utmCampaign: utmCampaign || null,
          utmContent: utmContent || null,

          attemptCount: 0,
          updatedAt: new Date(),
        })
        .returning();

      if (!order) {
        throw new Error("No se pudo crear el pedido.");
      }

      return {
        customer,
        order,
      };
    });

    return Response.json(
      {
        ok: true,
        message: "Pedido registrado correctamente.",

        data: {
          ...result,

          product: {
            id: catalogSelection.productId,
            name: catalogSelection.productName,
          },

          offer: {
            id: catalogSelection.offerId,
            name: catalogSelection.offerName,
            quantity: catalogSelection.quantity,
            priceCents: catalogSelection.priceCents,
          },

          variant: selectedVariant ?? null,

          delivery: {
            zoneId: zone.id,
            zoneName: zone.name,
            type: zone.deliveryType,
            feeCents: deliveryFeeCents,
            freeDelivery: zone.freeDelivery,
            shippingQuoteRequired: zone.requiresQuote,
          },

          pricing: {
            subtotalCents,
            deliveryFeeCents,
            totalCents: totalInCents,
          },
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Error al registrar el pedido:", error);

    return Response.json(
      {
        ok: false,
        message:
          "No se pudo registrar el pedido. Inténtalo nuevamente o comunícate con Plastimad.",
      },
      {
        status: 500,
      },
    );
  }
}