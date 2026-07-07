import type { ReactNode } from "react";

import { redirect } from "next/navigation";

import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

type CRMLayoutProps = {
  children: ReactNode;
};

/**
 * Protege todas las rutas dentro de /crm.
 *
 * Para el MVP, cualquier usuario autenticado
 * puede acceder porque el registro público está
 * deshabilitado y solo existe el administrador.
 *
 * Más adelante agregaremos roles.
 */
export default async function CRMLayout({
  children,
}: CRMLayoutProps) {
  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  const claims = data?.claims;

  if (
    error ||
    !claims ||
    typeof claims.sub !== "string"
  ) {
    redirect("/login?next=/crm");
  }

  const email =
    typeof claims.email === "string"
      ? claims.email
      : "Administrador";

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
              Plastimad CRM
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Sesión activa: {email}
            </p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {children}
    </div>
  );
}