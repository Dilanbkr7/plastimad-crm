"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
  error: string | null;
};

/**
 * Inicia sesión con correo y contraseña.
 */
export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(
    formData.get("email") ?? "",
  )
    .trim()
    .toLowerCase();

  const password = String(
    formData.get("password") ?? "",
  );

  const requestedPath = String(
    formData.get("next") ?? "/crm",
  );

  if (!email) {
    return {
      error:
        "Ingresa el correo del administrador.",
    };
  }

  if (password.length < 8) {
    return {
      error:
        "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  /**
   * Evita que un parámetro manipulable
   * redirija a un dominio externo.
   */
  const nextPath =
    requestedPath.startsWith("/crm")
      ? requestedPath
      : "/crm";

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    return {
      error:
        "Correo o contraseña incorrectos.",
    };
  }

  revalidatePath("/", "layout");

  redirect(nextPath);
}

/**
 * Cierra solamente la sesión de este navegador.
 */
export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut({
    scope: "local",
  });

  revalidatePath("/", "layout");

  redirect("/login");
}