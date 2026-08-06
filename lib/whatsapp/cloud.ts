import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_GRAPH_API_VERSION = "v24.0";
const MAX_TEXT_LENGTH = 4_000;

type WhatsAppRuntimeConfig = {
  accessToken: string;
  appSecret: string;
  businessAccountId: string;
  graphApiVersion: string;
  phoneNumberId: string;
  verifyToken: string;
  autoReplyEnabled: boolean;
};

type WhatsAppTextSendResult = {
  messageId: string;
};

export class WhatsAppConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppConfigurationError";
  }
}

export class WhatsAppApiError extends Error {
  status: number;
  code: number | null;
  details: unknown;

  constructor(options: {
    message: string;
    status: number;
    code?: number | null;
    details?: unknown;
  }) {
    super(options.message);
    this.name = "WhatsAppApiError";
    this.status = options.status;
    this.code = options.code ?? null;
    this.details = options.details;
  }
}

function readRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new WhatsAppConfigurationError(
      `No se encontró ${name} en las variables de entorno.`,
    );
  }

  return value;
}

function normalizeGraphApiVersion(value: string | undefined): string {
  const normalized = value?.trim() || DEFAULT_GRAPH_API_VERSION;

  if (!/^v\d+\.\d+$/.test(normalized)) {
    throw new WhatsAppConfigurationError(
      "WHATSAPP_GRAPH_API_VERSION debe tener un formato como v24.0.",
    );
  }

  return normalized;
}

export function getWhatsAppRuntimeConfig(): WhatsAppRuntimeConfig {
  return {
    accessToken: readRequiredEnvironmentVariable("WHATSAPP_ACCESS_TOKEN"),
    appSecret: readRequiredEnvironmentVariable("META_APP_SECRET"),
    businessAccountId: readRequiredEnvironmentVariable(
      "WHATSAPP_BUSINESS_ACCOUNT_ID",
    ),
    graphApiVersion: normalizeGraphApiVersion(
      process.env.WHATSAPP_GRAPH_API_VERSION,
    ),
    phoneNumberId: readRequiredEnvironmentVariable(
      "WHATSAPP_PHONE_NUMBER_ID",
    ),
    verifyToken: readRequiredEnvironmentVariable(
      "WHATSAPP_VERIFY_TOKEN",
    ),
    autoReplyEnabled:
      process.env.WHATSAPP_AUTO_REPLY_ENABLED?.trim().toLowerCase() !==
      "false",
  };
}

export function getWhatsAppPublicConfigurationStatus() {
  return {
    accessToken: Boolean(process.env.WHATSAPP_ACCESS_TOKEN?.trim()),
    appSecret: Boolean(process.env.META_APP_SECRET?.trim()),
    businessAccountId: Boolean(
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim(),
    ),
    graphApiVersion: normalizeGraphApiVersion(
      process.env.WHATSAPP_GRAPH_API_VERSION,
    ),
    phoneNumberId: Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    ),
    verifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN?.trim()),
    autoReplyEnabled:
      process.env.WHATSAPP_AUTO_REPLY_ENABLED?.trim().toLowerCase() !==
      "false",
  };
}

export function verifyMetaWebhookSignature(options: {
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string;
}): boolean {
  const prefix = "sha256=";
  const header = options.signatureHeader?.trim() ?? "";

  if (!header.startsWith(prefix)) {
    return false;
  }

  const receivedHex = header.slice(prefix.length);

  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) {
    return false;
  }

  const expectedHex = createHmac("sha256", options.appSecret)
    .update(options.rawBody, "utf8")
    .digest("hex");

  const received = Buffer.from(receivedHex, "hex");
  const expected = Buffer.from(expectedHex, "hex");

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

function buildMessagesEndpoint(config: WhatsAppRuntimeConfig): string {
  return `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`;
}

async function readMetaError(response: Response): Promise<{
  code: number | null;
  message: string;
  details: unknown;
}> {
  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object"
  ) {
    const error = payload.error as Record<string, unknown>;

    return {
      code: typeof error.code === "number" ? error.code : null,
      message:
        typeof error.message === "string"
          ? error.message
          : "Meta rechazó la solicitud.",
      details: payload,
    };
  }

  return {
    code: null,
    message: `Meta respondió con HTTP ${response.status}.`,
    details: payload,
  };
}

export async function sendWhatsAppText(options: {
  to: string;
  body: string;
  replyToMessageId?: string | null;
}): Promise<WhatsAppTextSendResult> {
  const config = getWhatsAppRuntimeConfig();
  const recipient = options.to.replace(/\D/g, "");
  const body = options.body.trim().slice(0, MAX_TEXT_LENGTH);

  if (!/^\d{8,15}$/.test(recipient)) {
    throw new WhatsAppApiError({
      status: 400,
      message: "El destinatario de WhatsApp no tiene formato internacional válido.",
    });
  }

  if (!body) {
    throw new WhatsAppApiError({
      status: 400,
      message: "No se puede enviar un mensaje vacío.",
    });
  }

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  };

  if (options.replyToMessageId) {
    payload.context = {
      message_id: options.replyToMessageId,
    };
  }

  const response = await fetch(buildMessagesEndpoint(config), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await readMetaError(response);

    throw new WhatsAppApiError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  const data = (await response.json()) as {
    messages?: Array<{ id?: string }>;
  };

  const messageId = data.messages?.[0]?.id;

  if (!messageId) {
    throw new WhatsAppApiError({
      status: 502,
      message: "Meta aceptó la solicitud, pero no devolvió el identificador del mensaje.",
      details: data,
    });
  }

  return { messageId };
}

export async function markWhatsAppMessageRead(
  messageId: string,
): Promise<void> {
  const config = getWhatsAppRuntimeConfig();

  const response = await fetch(buildMessagesEndpoint(config), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await readMetaError(response);

    throw new WhatsAppApiError({
      status: response.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }
}
