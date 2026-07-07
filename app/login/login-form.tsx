"use client";

import { useActionState } from "react";

import {
  login,
  type LoginState,
} from "./actions";

const initialState: LoginState = {
  error: null,
};

type LoginFormProps = {
  nextPath: string;
};

export default function LoginForm({
  nextPath,
}: LoginFormProps) {
  const [state, formAction, pending] =
    useActionState(
      login,
      initialState,
    );

  return (
    <form
      action={formAction}
      className="mt-8 space-y-5"
    >
      <input
        type="hidden"
        name="next"
        value={nextPath}
      />

      <label className="block text-sm font-bold text-slate-700">
        Correo electrónico

        <input
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="admin@plastimad.com"
        />
      </label>

      <label className="block text-sm font-bold text-slate-700">
        Contraseña

        <input
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="current-password"
          placeholder="••••••••••••"
        />
      </label>

      {state.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? "Verificando..."
          : "Ingresar al CRM"}
      </button>
    </form>
  );
}