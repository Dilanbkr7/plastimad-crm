import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const supabase = await createClient();

  const { data } =
    await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect("/crm");
  }

  const params = await searchParams;

  const requestedPath =
    typeof params.next === "string"
      ? params.next
      : "/crm";

  const nextPath =
    requestedPath.startsWith("/crm")
      ? requestedPath
      : "/crm";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-5 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(166,106,33,0.20),_transparent_35%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-bold text-emerald-700 hover:underline"
        >
          ← Volver a la landing
        </Link>

        <Image
          src="/plastimad/logo.png"
          alt="Plastimad"
          width={260}
          height={96}
          priority
          className="mx-auto mt-6 h-24 w-auto max-w-full object-contain"
        />

        <div className="mt-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
            Acceso administrativo
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Plastimad CRM
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Ingresa con una cuenta administrativa
            autorizada.
          </p>
        </div>

        <LoginForm nextPath={nextPath} />

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">
          El acceso está restringido al personal
          autorizado.
        </p>
      </section>
    </main>
  );
}