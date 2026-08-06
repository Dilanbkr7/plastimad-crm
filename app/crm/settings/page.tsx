import { eq } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";
import { businessSettings } from "@/lib/schema";
import { formatEcuadorMobile } from "@/lib/whatsapp";

import { updateBusinessWhatsApp } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "invalid-phone":
    "Ingresa un celular ecuatoriano válido, por ejemplo 0995152308 o 593995152308.",
  "settings-not-found":
    "No se encontró la configuración principal de Plastimad.",
};

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  await connection();

  const params = await searchParams;

  const [settings] = await db
    .select({
      businessName: businessSettings.businessName,
      phone: businessSettings.phone,
      whatsappNumber: businessSettings.whatsappNumber,
      supportTimezone: businessSettings.supportTimezone,
      supportDays: businessSettings.supportDays,
      supportOpenTime: businessSettings.supportOpenTime,
      supportCloseTime: businessSettings.supportCloseTime,
    })
    .from(businessSettings)
    .where(eq(businessSettings.code, "plastimad"))
    .limit(1);

  if (!settings) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            Configuración no disponible
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            No existe la fila de configuración con código plastimad.
          </p>
        </div>
      </main>
    );
  }

  const errorMessage = params.error
    ? errorMessages[params.error] ??
      "No se pudo guardar la configuración."
    : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            {settings.businessName}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Configuración de contacto
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Este número se utiliza en la página pública, el botón de WhatsApp,
            el resumen de pedidos y el asistente comercial.
          </p>
        </header>

        {params.saved === "1" && (
          <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Número empresarial actualizado correctamente.
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {errorMessage}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black text-slate-950">
            Horario de atención humana
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Días y horas
              </p>
              <p className="mt-2 font-black text-slate-950">
                Lunes a sábado, {settings.supportOpenTime} a {settings.supportCloseTime}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Zona horaria
              </p>
              <p className="mt-2 font-black text-slate-950">
                {settings.supportTimezone}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            El asistente automático puede responder las 24 horas. Fuera del horario informa que un asesor continuará en la siguiente jornada.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={updateBusinessWhatsApp} className="space-y-6">
            <div>
              <label
                htmlFor="whatsappNumber"
                className="text-sm font-bold text-slate-900"
              >
                Número de WhatsApp empresarial
              </label>
              <input
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                defaultValue={settings.whatsappNumber}
                placeholder="593995152308"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Puedes escribirlo como 0995152308, +593 99 515 2308 o
                593995152308. El sistema lo normaliza automáticamente.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Número visible actual
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {formatEcuadorMobile(settings.whatsappNumber)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Guardado técnicamente como {settings.whatsappNumber}
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-800"
            >
              Guardar número empresarial
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
