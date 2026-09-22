import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  crmAssignmentState,
  crmUsers,
} from "@/lib/schema";


export async function getNextAssignedUserId(): Promise<string | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(740182)`);
  const advisors = await tx
    .select({
      supabaseUserId: crmUsers.supabaseUserId,
      rotationOrder: crmUsers.rotationOrder,
      name: crmUsers.name,
    })
    .from(crmUsers)
    .where(
      and(eq(crmUsers.role, "ASESOR"), eq(crmUsers.active, true)),
    )
    .orderBy(
      asc(crmUsers.rotationOrder),
    );


  if (advisors.length === 0) {
    console.error(
      "No existen asesores activos para asignar",
    );

    return null;
  }


  const [state] = await tx
    .select({
      lastRotationOrder:
        crmAssignmentState.lastRotationOrder,
    })
    .from(crmAssignmentState)
    .where(
      eq(
        crmAssignmentState.id,
        1,
      ),
    )
    .limit(1);


  const lastOrder =
    state?.lastRotationOrder ?? 0;


  const nextAdvisor =
    advisors.find(
      (advisor) =>
        (advisor.rotationOrder ?? 0) > lastOrder,
    ) ?? advisors[0];


  await tx
    .update(crmAssignmentState)
    .set({
      lastRotationOrder:
        nextAdvisor.rotationOrder,
      updatedAt: new Date(),
    })
    .where(
      eq(
        crmAssignmentState.id,
        1,
      ),
    );


  return nextAdvisor.supabaseUserId;
  });
}