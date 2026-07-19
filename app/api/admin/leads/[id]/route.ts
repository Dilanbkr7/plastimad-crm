import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import { db } from "@/lib/db";
import {
  conversations,
  leads,
} from "@/lib/schema";
import {
  canTransitionLeadStatus,
  closedLeadStatuses,
  isLeadStatus,
  leadStatusesRequiringNote,
} from "@/lib/leads/status";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateLeadBody = {
  status?: unknown;
  notes?: unknown;
  requiresHuman?: unknown;
};

function readText(
  value: unknown,
  maximumLength: number,
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * PATCH /api/admin/leads/[id]
 *
 * Actualiza el seguimiento comercial de un lead.
 * Requiere una sesión administrativa válida.
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

    if (!isValidUuid(id)) {
      return Response.json(
        {
          ok: false,
          message:
            "El identificador del lead no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    let body: UpdateLeadBody;

    try {
      body =
        (await request.json()) as UpdateLeadBody;
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

    const requestedStatus = readText(
      body.status,
      30,
    ).toUpperCase();

    const notes = readText(
      body.notes,
      3000,
    );

    if (!isLeadStatus(requestedStatus)) {
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

    if (
      typeof body.requiresHuman !==
        "boolean" &&
      body.requiresHuman !== undefined
    ) {
      return Response.json(
        {
          ok: false,
          message:
            "El valor de atención humana no es válido.",
        },
        {
          status: 400,
        },
      );
    }

    const [currentLead] = await db
      .select({
        id: leads.id,
        status: leads.status,
        notes: leads.notes,
        requiresHuman:
          leads.requiresHuman,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .where(eq(leads.publicId, id))
      .limit(1);

    if (!currentLead) {
      return Response.json(
        {
          ok: false,
          message: "No se encontró el lead.",
        },
        {
          status: 404,
        },
      );
    }

    if (!isLeadStatus(currentLead.status)) {
      return Response.json(
        {
          ok: false,
          message:
            "El lead tiene un estado desconocido.",
        },
        {
          status: 409,
        },
      );
    }

    if (
      requestedStatus !==
        currentLead.status &&
      !canTransitionLeadStatus(
        currentLead.status,
        requestedStatus,
      )
    ) {
      return Response.json(
        {
          ok: false,
          message:
            `No se permite cambiar de ` +
            `${currentLead.status} a ` +
            `${requestedStatus}.`,
        },
        {
          status: 409,
        },
      );
    }

    if (
      leadStatusesRequiringNote.has(
        requestedStatus,
      ) &&
      notes.length < 3
    ) {
      return Response.json(
        {
          ok: false,
          message:
            "Debes escribir una nota para descartar el lead.",
        },
        {
          status: 400,
        },
      );
    }

    const requestedHuman =
      typeof body.requiresHuman ===
      "boolean"
        ? body.requiresHuman
        : currentLead.requiresHuman;

    const requiresHuman =
      closedLeadStatuses.has(
        requestedStatus,
      )
        ? false
        : requestedHuman;

    const conversationStatus =
      closedLeadStatuses.has(
        requestedStatus,
      )
        ? "CERRADA"
        : requiresHuman
          ? "ESCALADA"
          : "ABIERTA";

    const result = await db.transaction(
      async (transaction) => {
        /**
         * updated_at se usa como control de
         * concurrencia optimista.
         */
        const [updatedLead] =
          await transaction
            .update(leads)
            .set({
              status: requestedStatus,
              notes: notes || null,
              requiresHuman,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(
                  leads.id,
                  currentLead.id,
                ),
                eq(
                  leads.updatedAt,
                  currentLead.updatedAt,
                ),
              ),
            )
            .returning();

        if (!updatedLead) {
          throw new Error(
            "El lead fue modificado por otra sesión. Actualiza la página e inténtalo nuevamente.",
          );
        }

        await transaction
          .update(conversations)
          .set({
            status: conversationStatus,
            requiresHuman,
            updatedAt: new Date(),
          })
          .where(
            eq(
              conversations.leadId,
              currentLead.id,
            ),
          );

        const [latestConversation] =
          await transaction
            .select({
              id: conversations.id,
              publicId:
                conversations.publicId,
              status: conversations.status,
            })
            .from(conversations)
            .where(
              eq(
                conversations.leadId,
                currentLead.id,
              ),
            )
            .orderBy(
              desc(
                conversations.updatedAt,
              ),
            )
            .limit(1);

        return {
          lead: updatedLead,
          latestConversation:
            latestConversation ?? null,
        };
      },
    );

    return Response.json({
      ok: true,
      message:
        "Lead actualizado correctamente.",
      data: result,
    });
  } catch (error) {
    console.error(
      "Error al actualizar el lead:",
      error,
    );

    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el lead.",
      },
      {
        status: 500,
      },
    );
  }
}
