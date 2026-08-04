"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { businessSettings } from "@/lib/schema";
import { createClient } from "@/lib/supabase/server";
import {
  formatEcuadorMobile,
  isValidEcuadorMobile,
  toWhatsAppNumber,
} from "@/lib/whatsapp";

function redirectWithError(code: string): never {
  redirect(`/crm/settings?error=${encodeURIComponent(code)}`);
}

/**
 * Actualiza el número empresarial desde el CRM protegido.
 * Un solo valor alimenta la página pública, botones, pedidos y asistente.
 */
export async function updateBusinessWhatsApp(
  formData: FormData,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (
    error ||
    !data?.claims ||
    typeof data.claims.sub !== "string"
  ) {
    redirect("/login?next=/crm/settings");
  }

  const rawNumber = String(
    formData.get("whatsappNumber") ?? "",
  ).trim();

  if (!isValidEcuadorMobile(rawNumber)) {
    redirectWithError("invalid-phone");
  }

  const whatsappNumber = toWhatsAppNumber(rawNumber);
  const phone = formatEcuadorMobile(whatsappNumber);

  const updatedRows = await db
    .update(businessSettings)
    .set({
      phone,
      whatsappNumber,
      updatedAt: new Date(),
    })
    .where(eq(businessSettings.code, "plastimad"))
    .returning({ id: businessSettings.id });

  if (updatedRows.length === 0) {
    redirectWithError("settings-not-found");
  }

  revalidatePath("/", "layout");
  revalidatePath("/crm/settings");

  redirect("/crm/settings?saved=1");
}
