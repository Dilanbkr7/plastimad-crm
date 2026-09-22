import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 utiliza proxy.ts
 * en lugar del antiguo middleware.ts.
 */
export async function proxy(
  request: NextRequest,
) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /**
     * Ejecuta el proxy en las rutas de la aplicación,
     * excluyendo archivos internos e imágenes.
     */
    "/crm/:path*",
    "/login",
    "/api/admin/:path*",
    "/api/whatsapp/media/:path*",
  ],
};
