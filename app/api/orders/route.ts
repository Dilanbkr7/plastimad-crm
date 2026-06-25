import { db } from "@/lib/db";
import { customers, orders } from "@/lib/schema";

/**
 * Estructura de datos que esperamos recibir
 * desde el formulario de pedido.
 */
type CreateOrderBody = {
  name?: unknown;
  phone?: unknown;
  product?: unknown;
  quantity?: unknown;
  address?: unknown;
};

/**
 * GET /api/orders
 *
 * Permite comprobar desde el navegador
 * que la API está activa.
 */
export async function GET() {
  return Response.json(
    {
      ok: true,
      message: "API de pedidos de Plastimad funcionando.",
      endpoint: "/api/orders",
      methods: ["GET", "POST"],
    },
    {
      status: 200,
    },
  );
}

/**
 * POST /api/orders
 *
 * Recibe los datos del cliente, los valida,
 * registra el cliente y crea su pedido.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderBody;

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";

    const product =
      typeof body.product === "string"
        ? body.product.trim()
        : "";

    const address =
      typeof body.address === "string"
        ? body.address.trim()
        : "";

    const quantity = Number(body.quantity);

    /**
     * Validaciones del pedido.
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

    if (phone.length < 7) {
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

    if (!product) {
      return Response.json(
        {
          ok: false,
          message: "El producto es obligatorio.",
        },
        {
          status: 400,
        },
      );
    }

    if (!address) {
      return Response.json(
        {
          ok: false,
          message: "La dirección es obligatoria.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      return Response.json(
        {
          ok: false,
          message:
            "La cantidad debe ser un número entero entre 1 y 20.",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * Precio temporal:
     * USD 10 por unidad.
     *
     * El dinero se guarda en centavos.
     * 1000 centavos = USD 10,00.
     */
    const totalInCents = quantity * 1000;

    /**
     * La transacción garantiza que cliente y pedido
     * se creen juntos.
     *
     * Si el pedido falla, también se elimina
     * la creación incompleta del cliente.
     */
    const result = await db.transaction(async (transaction) => {
      const [customer] = await transaction
        .insert(customers)
        .values({
          name,
          phone,
        })
        .returning();

      if (!customer) {
        throw new Error("No se pudo crear el cliente.");
      }

      const [order] = await transaction
        .insert(orders)
        .values({
          customerId: customer.id,
          product,
          quantity,
          address,
          status: "RECIBIDO",
          total: totalInCents,
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
        data: result,
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
          "No se pudo registrar el pedido. Revisa la conexión con PostgreSQL.",
      },
      {
        status: 500,
      },
    );
  }
}