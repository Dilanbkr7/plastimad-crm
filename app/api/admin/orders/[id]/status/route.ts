import {
  and,
  eq,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  orders,
  orderStatusHistory,
} from "@/lib/schema";
import {
  canTransitionOrderStatus,
  isOrderStatus,
  statusesRequiringNote,
} from "@/lib/orders/status";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateStatusBody = {
  status?: unknown;
  note?: unknown;
};

/**
 * PATCH /api/admin/orders/[id]/status
 *
 * Endpoint administrativo encargado de:
 * - comprobar la sesión;
 * - validar el pedido;
 * - validar la transición;
 * - actualizar el estado;
 * - registrar el historial.
 */
export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  try {
    const supabase = await createClient();

    const { data, error } =
      await supabase.auth.getClaims();

    const claims = data?.claims;

    if (
      error ||
      !claims ||
      typeof claims.sub !== "string"
    ) {
      return Response.json(
        {
          ok: false,
          message: "No autorizado.",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;
    const orderId = Number(id);

    if (
      !Number.isInteger(orderId) ||
      orderId < 1
    ) {
      return Response.json(
        {
          ok: false,
          message:
            "El identificador del pedido no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    let body: UpdateStatusBody;

    try {
      body =
        (await request.json()) as UpdateStatusBody;
    } catch {
      return Response.json(
        {
          ok: false,
          message:
            "La solicitud no contiene JSON válido.",
        },
        {
          status: 400,
        },
      );
    }

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : "";

    const note =
      typeof body.note === "string"
        ? body.note.trim().slice(0, 1000)
        : "";

    if (!isOrderStatus(requestedStatus)) {
      return Response.json(
        {
          ok: false,
          message:
            "El estado seleccionado no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    const [currentOrder] = await db
      .select({
        id: orders.id,
        status: orders.status,
      })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!currentOrder) {
      return Response.json(
        {
          ok: false,
          message: "No se encontró el pedido.",
        },
        {
          status: 404,
        },
      );
    }

    if (!isOrderStatus(currentOrder.status)) {
      return Response.json(
        {
          ok: false,
          message:
            "El pedido tiene un estado desconocido.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      requestedStatus === currentOrder.status
    ) {
      return Response.json(
        {
          ok: false,
          message:
            "El pedido ya tiene ese estado.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      !canTransitionOrderStatus(
        currentOrder.status,
        requestedStatus,
      )
    ) {
      return Response.json(
        {
          ok: false,
          message:
            `No se permite cambiar de ` +
            `${currentOrder.status} a ` +
            `${requestedStatus}.`,
        },
        {
          status: 409,
        },
      );
    }

    if (
      statusesRequiringNote.has(
        requestedStatus,
      ) &&
      note.length < 3
    ) {
      return Response.json(
        {
          ok: false,
          message:
            "Debes escribir una observación para este estado.",
        },
        {
          status: 400,
        },
      );
    }

    const changedByEmail =
      typeof claims.email === "string"
        ? claims.email
        : "administrador@plastimad.local";

    const result = await db.transaction(
      async (transaction) => {
        /**
         * La condición incluye el estado anterior.
         *
         * Esto evita que dos administradores actualicen
         * simultáneamente el mismo pedido utilizando
         * información desactualizada.
         */
        const [updatedOrder] =
          await transaction
            .update(orders)
            .set({
              status: requestedStatus,

              /**
               * Al cerrar una entrega como cobrada,
               * también actualizamos el estado del pago.
               */
              ...(requestedStatus ===
              "ENTREGADO_COBRADO"
                ? {
                    paymentStatus: "PAGADO",
                  }
                : {}),

              updatedAt: new Date(),
            })
            .where(
              and(
                eq(orders.id, orderId),
                eq(
                  orders.status,
                  currentOrder.status,
                ),
              ),
            )
            .returning();

        if (!updatedOrder) {
          throw new Error(
            "El pedido fue modificado por otra sesión. Actualiza la página e inténtalo nuevamente.",
          );
        }

        const [historyEntry] =
          await transaction
            .insert(orderStatusHistory)
            .values({
              orderId,
              previousStatus:
                currentOrder.status,
              newStatus: requestedStatus,
              note: note || null,
              changedByUserId: claims.sub,
              changedByEmail,
            })
            .returning();

        if (!historyEntry) {
          throw new Error(
            "No se pudo registrar el historial.",
          );
        }

        return {
          order: updatedOrder,
          history: historyEntry,
        };
      },
    );

    return Response.json({
      ok: true,
      message:
        "Estado actualizado correctamente.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Error al actualizar el estado:",
      error,
    );

    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el estado.",
      },
      {
        status: 500,
      },
    );
  }
}