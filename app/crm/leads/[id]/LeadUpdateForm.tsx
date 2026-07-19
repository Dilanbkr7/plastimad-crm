"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  closedLeadStatuses,
  leadStatusLabels,
  leadStatusTransitions,
  leadStatusesRequiringNote,
  type LeadStatus,
} from "@/lib/leads/status";

type LeadUpdateFormProps = {
  publicId: string;
  currentStatus: LeadStatus;
  currentNotes: string | null;
  currentRequiresHuman: boolean;
};

type UpdateLeadResponse = {
  ok: boolean;
  message: string;
};

export default function LeadUpdateForm({
  publicId,
  currentStatus,
  currentNotes,
  currentRequiresHuman,
}: LeadUpdateFormProps) {
  const router = useRouter();

  const [selectedStatus, setSelectedStatus] =
    useState<LeadStatus>(
      currentStatus,
    );

  const [notes, setNotes] =
    useState(currentNotes ?? "");

  const [
    requiresHuman,
    setRequiresHuman,
  ] = useState(
    currentRequiresHuman,
  );

  const [loading, setLoading] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const allowedStatuses = [
    currentStatus,
    ...leadStatusTransitions[
      currentStatus
    ],
  ];

  const selectedIsAllowed =
    allowedStatuses.includes(
      selectedStatus,
    );

  const effectiveStatus =
    selectedIsAllowed
      ? selectedStatus
      : currentStatus;

  const noteRequired =
    leadStatusesRequiringNote.has(
      effectiveStatus,
    );

  const closedStatus =
    closedLeadStatuses.has(
      effectiveStatus,
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (
      noteRequired &&
      notes.trim().length < 3
    ) {
      setErrorMessage(
        "Debes escribir una nota para descartar el lead.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/leads/${publicId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: effectiveStatus,
            notes,
            requiresHuman:
              closedStatus
                ? false
                : requiresHuman,
          }),
        },
      );

      const payload =
        (await response.json()) as UpdateLeadResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message ||
            "No se pudo actualizar el lead.",
        );
      }

      setSuccessMessage(
        payload.message,
      );

      if (closedStatus) {
        setRequiresHuman(false);
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el lead.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        Seguimiento comercial
      </p>

      <h2 className="mt-2 text-xl font-black text-slate-950">
        Actualizar lead
      </h2>

      <label className="mt-5 block text-sm font-bold text-slate-700">
        Estado

        <select
          value={effectiveStatus}
          onChange={(event) => {
            const nextStatus =
              event.target
                .value as LeadStatus;

            setSelectedStatus(
              nextStatus,
            );

            if (
              closedLeadStatuses.has(
                nextStatus,
              )
            ) {
              setRequiresHuman(false);
            }

            setSuccessMessage("");
            setErrorMessage("");
          }}
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        >
          {allowedStatuses.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {
                  leadStatusLabels[
                    status
                  ]
                }
              </option>
            ),
          )}
        </select>
      </label>

      <label className="mt-5 block text-sm font-bold text-slate-700">
        Nota interna
        {noteRequired ? " *" : ""}

        <textarea
          value={notes}
          onChange={(event) =>
            setNotes(
              event.target.value,
            )
          }
          required={noteRequired}
          maxLength={3000}
          placeholder={
            noteRequired
              ? "Explica por qué se descarta este lead."
              : "Ej. Cliente contactado por WhatsApp. Solicita entrega para el viernes."
          }
          className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />
      </label>

      <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={
            closedStatus
              ? false
              : requiresHuman
          }
          disabled={closedStatus}
          onChange={(event) =>
            setRequiresHuman(
              event.target.checked,
            )
          }
          className="mt-1 h-4 w-4 accent-emerald-700"
        />

        <span>
          <strong className="block text-slate-900">
            Requiere atención humana
          </strong>

          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Mantiene la conversación marcada
            para seguimiento prioritario.
          </span>
        </span>
      </label>

      {successMessage && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Guardando..."
          : "Guardar seguimiento"}
      </button>
    </form>
  );
}
