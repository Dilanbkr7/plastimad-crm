import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicConfig } from "./config";

/**
 * Cliente de Supabase para componentes
 * que se ejecutan en el navegador.
 */
export function createClient() {
  const { url, publishableKey } =
    getSupabasePublicConfig();

  return createBrowserClient(
    url,
    publishableKey,
  );
}