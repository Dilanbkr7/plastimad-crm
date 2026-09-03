import { and, asc, eq, gt } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  crmUsers,
  conversations,
} from "@/lib/schema";


export async function assignConversationToAdvisor(
  conversationId: number,
) {

  const advisors = await db
    .select({
      supabaseUserId: crmUsers.supabaseUserId,
      rotationOrder: crmUsers.rotationOrder,
    })
    .from(crmUsers)
    .where(
      and(
        eq(crmUsers.role, "ASESOR"),
        eq(crmUsers.active, true),
      ),
    )
    .orderBy(
      asc(crmUsers.rotationOrder),
    );


  if (advisors.length === 0) {
    return null;
  }


  const currentConversation =
    await db
      .select({
        assignedUserId:
          conversations.assignedUserId,
      })
      .from(conversations)
      .where(
        eq(
          conversations.id,
          conversationId,
        ),
      )
      .limit(1);


  if (
    currentConversation[0]?.assignedUserId
  ) {
    return currentConversation[0].assignedUserId;
  }


  const lastAssigned =
    advisors[advisors.length - 1];


  const nextAdvisor =
    advisors.find(
      (advisor) =>
        advisor.rotationOrder >
        (lastAssigned.rotationOrder ?? 0),
    )
    ??
    advisors[0];


  await db
    .update(conversations)
    .set({
      assignedUserId:
        nextAdvisor.supabaseUserId,
      updatedAt:
        new Date(),
    })
    .where(
      eq(
        conversations.id,
        conversationId,
      ),
    );


  return nextAdvisor.supabaseUserId;
}