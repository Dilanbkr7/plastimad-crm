import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { crmUsers } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";

// React cache only deduplicates within a render; never cache a session globally.
export const getCrmUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || typeof data?.claims?.sub !== "string") return null;
  const [user] = await db.select({
    id: crmUsers.supabaseUserId,
    role: crmUsers.role,
    email: crmUsers.email,
  }).from(crmUsers).where(and(
    eq(crmUsers.supabaseUserId, data.claims.sub),
    eq(crmUsers.active, true),
  )).limit(1);
  return user && ["OWNER", "ADMIN", "ASESOR"].includes(user.role) ? user : null;
});
