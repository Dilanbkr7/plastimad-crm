"use client";

import type {
  FormEvent,
  KeyboardEvent,
} from "react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type AssistantApiResponse = {
  ok: boolean;
  message?: string;
  data?: {
    conversationId: string;
    reply: string;
    intent: string;
    requiresHuman: boolean;
    status: string;
    consentRequired: boolean;
    leadSaved: boolean;
    contact: {
      businessName: string;
      phone: string | null;
      email: string | null;
      whatsappNumber: string | null;
      whatsappUrl: string | null;
    };
  };
};

type AssistantChatProps = {
  businessName: string;
  whatsappNumber: string;
};

type AssistantRequest = {
  conversationId?: string;
  message: string;
  name?: string;
  phone?: string;
  email?: string;
  consentAccepted?: boolean;
};

const STORAGE_KEY =
  "plastimad_assistant_conversation_id";

const quickActions = [
  {
    label: "Productos",
    message: "¿Qué productos tienen disponibles?",
  },
  {
    label: "Precios",
    message: "¿Cuáles son los precios y combos?",
  },
  {
    label: "Entrega",
    message: "¿Cómo funcionan las entregas?",
  },
  {
    label: "Pagos",
    message: "¿Qué métodos de pago aceptan?",
  },
  {
    label: "Hablar con un asesor",
    message: "Quiero que me contacte un asesor.",
  },
];

function createMessage(
  role: ChatRole,
  content: string,
): ChatMessage {
  return {
    id:
      typeof crypto !== "undefined" &&
      "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    role,
    content,
  };
}

function readStoredConversationId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.sessionStorage.getItem(STORAGE_KEY) ?? ""
  );
}

function storeConversationId(
  conversationId: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    STORAGE_KEY,
    conversationId,
  );
}

export default function AssistantChat({
  businessName,
  whatsappNumber,
}: AssistantChatProps) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] =
    useState("");
  const [messages, setMessages] = useState<
    ChatMessage[]
  >([
    {
      id: "assistant-welcome",
      role: "assistant",
      content: `Soy el asistente comercial de ${businessName}. Puedo ayudarte con productos, precios, entregas, pagos o comunicarte con un asesor.`,
    },
  ]);
  const [messageInput, setMessageInput] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");
  const [requiresHuman, setRequiresHuman] =
    useState(false);
  const [leadSaved, setLeadSaved] =
    useState(false);
  const [showContactForm, setShowContactForm] =
    useState(false);
  const [contactName, setContactName] =
    useState("");
  const [contactPhone, setContactPhone] =
    useState("");
  const [contactEmail, setContactEmail] =
    useState("");
  const [consentAccepted, setConsentAccepted] =
    useState(false);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading, showContactForm]);

  const cleanWhatsappNumber =
    whatsappNumber.replace(/\D/g, "");

  const whatsappUrl = cleanWhatsappNumber
    ? `https://wa.me/${cleanWhatsappNumber}`
    : "";

  async function requestAssistant(
    requestBody: AssistantRequest,
  ): Promise<AssistantApiResponse["data"]> {
    const activeConversationId =
      conversationId ||
      readStoredConversationId();

    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...requestBody,
        ...(activeConversationId
          ? {
              conversationId:
                activeConversationId,
            }
          : {}),
      }),
    });

    const payload =
      (await response.json()) as AssistantApiResponse;

    if (
      !response.ok ||
      !payload.ok ||
      !payload.data
    ) {
      throw new Error(
        payload.message ||
          "No se pudo procesar el mensaje.",
      );
    }

    setConversationId(
      payload.data.conversationId,
    );
    storeConversationId(
      payload.data.conversationId,
    );
    setRequiresHuman(
      payload.data.requiresHuman,
    );
    setLeadSaved(payload.data.leadSaved);

    if (
      payload.data.requiresHuman &&
      !payload.data.leadSaved
    ) {
      setShowContactForm(true);
    }

    return payload.data;
  }

  async function sendMessage(
    rawMessage: string,
  ) {
    const cleanMessage = rawMessage
      .trim()
      .slice(0, 1500);

    if (!cleanMessage || loading) {
      return;
    }

    setErrorMessage("");
    setLoading(true);
    setMessageInput("");
    setMessages((current) => [
      ...current,
      createMessage("user", cleanMessage),
    ]);

    try {
      const data = await requestAssistant({
        message: cleanMessage,
      });

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          data?.reply ??
            "No se pudo obtener una respuesta.",
        ),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo procesar el mensaje.";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  function handleMessageSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    void sendMessage(messageInput);
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      void sendMessage(messageInput);
    }
  }

  async function handleContactSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const name = contactName.trim();
    const phone = contactPhone
      .replace(/\s+/g, "")
      .trim();
    const email = contactEmail
      .trim()
      .toLowerCase();

    setErrorMessage("");

    if (name.length < 2) {
      setErrorMessage(
        "Ingresa un nombre válido.",
      );
      return;
    }

    if (phone.length < 9) {
      setErrorMessage(
        "Ingresa un teléfono válido.",
      );
      return;
    }

    if (!consentAccepted) {
      setErrorMessage(
        "Debes aceptar el tratamiento de datos para solicitar seguimiento.",
      );
      return;
    }

    setLoading(true);

    const contactMessage =
      "Quiero que me contacte un asesor.";

    setMessages((current) => [
      ...current,
      createMessage("user", contactMessage),
    ]);

    try {
      const data = await requestAssistant({
        message: contactMessage,
        name,
        phone,
        email,
        consentAccepted: true,
      });

      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          data?.reply ??
            "Tus datos fueron registrados.",
        ),
      ]);

      setShowContactForm(false);
      setLeadSaved(true);
      setContactName("");
      setContactPhone("");
      setContactEmail("");
      setConsentAccepted(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron registrar los datos.";

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        aria-label={
          open
            ? "Cerrar asistente"
            : "Abrir asistente"
        }
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-2xl shadow-emerald-950/30 transition hover:scale-105 hover:bg-[var(--brand-dark)] focus:outline-none focus:ring-4 focus:ring-emerald-200"
      >
        {open ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M7 18l-4 3v-5a8 8 0 118 4H7z" />
            <path d="M8 10h.01M12 10h.01M16 10h.01" />
          </svg>
        )}
      </button>

      {open && (
        <section
          aria-label="Asistente comercial"
          className="fixed bottom-24 right-4 z-50 flex h-[min(720px,calc(100dvh-8rem))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/25 sm:right-5"
        >
          <header className="flex items-center justify-between gap-4 bg-slate-950 px-5 py-4 text-white">
            <div>
              <p className="font-black">
                Asistente de {businessName}
              </p>
              <p className="mt-1 text-xs text-emerald-200">
                Respuestas comerciales inmediatas
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              En línea
            </span>
          </header>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void sendMessage(
                      action.message,
                    )
                  }
                  className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-emerald-400 hover:text-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5"
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "rounded-br-md bg-[var(--brand-primary)] text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                  Escribiendo…
                </div>
              </div>
            )}

            {requiresHuman &&
              !leadSaved &&
              showContactForm && (
                <form
                  onSubmit={handleContactSubmit}
                  className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"
                >
                  <p className="font-black text-slate-950">
                    Solicitar seguimiento
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Los datos solo se guardarán
                    cuando aceptes expresamente su
                    tratamiento.
                  </p>

                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      value={contactName}
                      onChange={(event) =>
                        setContactName(
                          event.target.value,
                        )
                      }
                      required
                      minLength={2}
                      maxLength={150}
                      autoComplete="name"
                      placeholder="Nombre completo"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-emerald-100"
                    />

                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(event) =>
                        setContactPhone(
                          event.target.value,
                        )
                      }
                      required
                      minLength={9}
                      maxLength={20}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="Teléfono / WhatsApp"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-emerald-100"
                    />

                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(event) =>
                        setContactEmail(
                          event.target.value,
                        )
                      }
                      maxLength={255}
                      autoComplete="email"
                      placeholder="Correo (opcional)"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-emerald-100"
                    />
                  </div>

                  <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-slate-600">
                    <input
                      type="checkbox"
                      checked={consentAccepted}
                      onChange={(event) =>
                        setConsentAccepted(
                          event.target.checked,
                        )
                      }
                      required
                      className="mt-1 h-4 w-4 accent-[var(--brand-primary)]"
                    />

                    <span>
                      Autorizo a {businessName} a
                      almacenar y utilizar estos datos
                      para responder mi consulta y dar
                      seguimiento comercial.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 w-full rounded-xl bg-[var(--brand-primary)] px-4 py-3 text-sm font-black text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Enviar datos al asesor
                  </button>
                </form>
              )}

            {leadSaved && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
                Solicitud registrada. El equipo
                comercial podrá revisar la conversación
                y tus datos de contacto.
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-700"
              >
                {errorMessage}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <footer className="border-t border-slate-200 bg-white p-4">
            <form
              onSubmit={handleMessageSubmit}
              className="flex items-end gap-2"
            >
              <textarea
                value={messageInput}
                onChange={(event) =>
                  setMessageInput(
                    event.target.value,
                  )
                }
                onKeyDown={handleInputKeyDown}
                disabled={loading}
                rows={1}
                maxLength={1500}
                placeholder="Escribe tu consulta…"
                aria-label="Mensaje"
                className="max-h-28 min-h-12 flex-1 resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !messageInput.trim()
                }
                aria-label="Enviar mensaje"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-white transition hover:bg-[var(--brand-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4z" />
                </svg>
              </button>
            </form>

            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
              <span>
                No compartas información sensible.
              </span>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--brand-primary)] hover:underline"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </footer>
        </section>
      )}
    </>
  );
}