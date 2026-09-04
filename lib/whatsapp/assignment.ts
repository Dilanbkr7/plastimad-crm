import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  crmAssignmentState,
  crmUsers,
} from "@/lib/schema";


export async function getNextAssignedUserId(): Promise<string | null> {
  const advisors = await db
    .select({
      supabaseUserId: crmUsers.supabaseUserId,
      rotationOrder: crmUsers.rotationOrder,
      name: crmUsers.name,
    })
    .from(crmUsers)
    .where(
      eq(crmUsers.role, "ASESOR"),
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


  const [state] = await db
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


  await db
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


  console.log(
    "ASESOR ASIGNADO:",
    nextAdvisor.name,
    nextAdvisor.supabaseUserId,
  );


  return nextAdvisor.supabaseUserId;
}