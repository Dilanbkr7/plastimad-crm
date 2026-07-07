import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicConfig } from "./config";

/**
 * Cliente de Supabase para:
 * - Server Components;
 * - Server Actions;
 * - Route Handlers.
 *
 * La sesión se mantiene mediante cookies.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const { url, publishableKey } =
    getSupabasePublicConfig();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options,
                );
              },
            );
          } catch {
            /**
             * Algunos Server Components pueden leer
             * cookies, pero no modificarlas.
             *
             * proxy.ts se encarga de renovar
             * y guardar la sesión.
             */
          }
        },
      },
    },
  );
}