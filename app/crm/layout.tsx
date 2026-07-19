import type { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

type CRMLayoutProps = {
  children: ReactNode;
};

/**
 * Protege todas las rutas dentro de /crm.
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
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <Link
              href="/crm"
              className="text-lg font-black tracking-tight hover:text-emerald-300"
            >
              Plastimad CRM
            </Link>

            <p className="mt-1 text-xs text-slate-400">
              Sesión activa: {email}
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            <Link
              href="/crm"
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Pedidos
            </Link>

            <Link
              href="/crm/leads"
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Leads
            </Link>

            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              Ver landing
            </Link>

            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-black text-white transition hover:bg-rose-700"
              >
                Cerrar sesión
              </button>
            </form>
          </nav>
        </div>
      </header>

      {children}
    </div>
  );
}
