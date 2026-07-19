/**
 * Obtiene la configuración pública de Supabase.
 *
 * Se acepta:
 * - la nueva Publishable Key;
 * - la antigua ANON Key, mientras siga configurada.
 *
 * Nunca se coloca aquí DATABASE_URL,
 * contraseñas ni claves privadas.
 */
export function getSupabasePublicConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "No se encontró NEXT_PUBLIC_SUPABASE_URL en .env.local.",
    );
  }

  if (!publishableKey) {
    throw new Error(
      "No se encontró la clave pública de Supabase en .env.local.",
    );
  }

  return {
    url,
    publishableKey,
  };
}