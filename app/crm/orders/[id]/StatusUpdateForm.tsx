"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  statusLabels,
  statusTransitions,
  statusesRequiringNote,
  type OrderStatus,
} from "@/lib/orders/status";

type StatusUpdateFormProps = {
  orderId: number;
  currentStatus: OrderStatus;
};

type UpdateStatusResponse = {
  ok: boolean;
  message: string;
};

export default function StatusUpdateForm({
  orderId,
  currentStatus,
}: StatusUpdateFormProps) {
  const router = useRouter();

  const availableStatuses =
    statusTransitions[currentStatus];

  const firstAvailableStatus =
    availableStatuses[0] ?? "";

  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus | "">(
      firstAvailableStatus,
    );

  const [note, setNote] = useState("");
  const [loading, setLoading] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedStatusIsAvailable =
    selectedStatus !== "" &&
    (
      availableStatuses as readonly OrderStatus[]
    ).includes(selectedStatus);

  const effectiveSelectedStatus =
    selectedStatusIsAvailable
      ? selectedStatus
      : firstAvailableStatus;

  const noteRequired =
    statusesRequiringNote.has(
      effectiveSelectedStatus,
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!effectiveSelectedStatus) {
      setErrorMessage(
        "Selecciona el siguiente estado.",
      );
      return;
    }

    if (
      effectiveSelectedStatus === currentStatus
    ) {
      setErrorMessage(
        "Selecciona un estado diferente al estado actual.",
      );
      return;
    }

    if (
      noteRequired &&
      note.trim().length < 3
    ) {
      setErrorMessage(
        "Debes escribir una observación para este estado.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: effectiveSelectedStatus,
            note,
          }),
        },
      );

      const payload =
        (await response.json()) as UpdateStatusResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message ||
            "No se pudo actualizar el estado.",
        );
      }

      setSuccessMessage(payload.message);
      setNote("");
      setSelectedStatus("");

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (availableStatuses.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">
          Pedido cerrado
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Este pedido no tiene más cambios de estado
          disponibles.
        </p>

        <div className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700">
          Estado actual:{" "}
          {statusLabels[currentStatus]}
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        Operación
      </p>

      <h2 className="mt-2 text-xl font-black text-slate-950">
        Actualizar estado
      </h2>

      <div className="mt-4 rounded-xl bg-slate-100 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500">
          Estado actual
        </p>

        <p className="mt-1 font-black text-slate-900">
          {statusLabels[currentStatus]}
        </p>
      </div>

      <label className="mt-5 block text-sm font-bold text-slate-700">
        Siguiente estado

        <select
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          value={effectiveSelectedStatus}
          onChange={(event) => {
            setSelectedStatus(
              event.target.value as OrderStatus,
            );

            setSuccessMessage("");
            setErrorMessage("");
          }}
        >
          {availableStatuses.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {statusLabels[status]}
              </option>
            ),
          )}
        </select>
      </label>

      <label className="mt-5 block text-sm font-bold text-slate-700">
        Observación
        {noteRequired ? " *" : ""}

        <textarea
          className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
          required={noteRequired}
          maxLength={1000}
          placeholder={
            noteRequired
              ? "Explica la novedad, cancelación o reprogramación."
              : "Ej. Cliente confirmó dirección y horario por WhatsApp."
          }
        />
      </label>

      {noteRequired && (
        <p className="mt-2 text-xs font-medium text-amber-700">
          La observación es obligatoria para este
          estado.
        </p>
      )}

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
        disabled={
          loading ||
          !effectiveSelectedStatus ||
          effectiveSelectedStatus ===
            currentStatus
        }
        className="mt-5 w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Actualizando..."
          : "Guardar nuevo estado"}
      </button>
    </form>
  );
}