export type MetaWebhookPayload = {
  object?: unknown;
  entry?: unknown;
};

export type MetaMessage = {
  from?: unknown;
  id?: unknown;
  timestamp?: unknown;
  type?: unknown;
  context?: {
    id?: unknown;
  };
  text?: {
    body?: unknown;
  };
  button?: {
    text?: unknown;
    payload?: unknown;
  };
  interactive?: {
    type?: unknown;
    button_reply?: {
      id?: unknown;
      title?: unknown;
    };
    list_reply?: {
      id?: unknown;
      title?: unknown;
      description?: unknown;
    };
  };
  image?: {
    id?: unknown;
    caption?: unknown;
    mime_type?: unknown;
  };
  audio?: {
    id?: unknown;
    mime_type?: unknown;
    voice?: unknown;
  };
  video?: {
    id?: unknown;
    caption?: unknown;
    mime_type?: unknown;
  };
  document?: {
    id?: unknown;
    caption?: unknown;
    filename?: unknown;
    mime_type?: unknown;
  };
  sticker?: {
    id?: unknown;
    mime_type?: unknown;
  };
  location?: {
    latitude?: unknown;
    longitude?: unknown;
    name?: unknown;
    address?: unknown;
  };
  reaction?: {
    message_id?: unknown;
    emoji?: unknown;
  };
  [key: string]: unknown;
};

export type MetaMessageEcho = MetaMessage & {
  to?: unknown;
};

export type MetaStatus = {
  id?: unknown;
  status?: unknown;
  timestamp?: unknown;
  recipient_id?: unknown;
  conversation?: {
    expiration_timestamp?: unknown;
  };
  errors?: unknown;
  [key: string]: unknown;
};

export type MetaWebhookValue = {
  metadata?: {
    display_phone_number?: unknown;
    phone_number_id?: unknown;
  };
  contacts?: unknown;
  messages?: unknown;
  statuses?: unknown;
  message_echoes?: unknown;
  [key: string]: unknown;
};

export type ParsedMetaChange = {
  field: string;
  value: MetaWebhookValue;
  businessAccountId: string;
};

function readString(value: unknown, maximumLength = 500): string {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

export function parseMetaChanges(payload: MetaWebhookPayload): ParsedMetaChange[] {
  if (!Array.isArray(payload.entry)) {
    return [];
  }

  const changes: ParsedMetaChange[] = [];

  for (const rawEntry of payload.entry) {
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const entry = rawEntry as Record<string, unknown>;
    const businessAccountId = readString(entry.id, 100);

    if (!Array.isArray(entry.changes)) {
      continue;
    }

    for (const rawChange of entry.changes) {
      if (!rawChange || typeof rawChange !== "object") {
        continue;
      }

      const change = rawChange as Record<string, unknown>;
      const field = readString(change.field, 100);
      const value = change.value;

      if (!field || !value || typeof value !== "object") {
        continue;
      }

      changes.push({
        field,
        value: value as MetaWebhookValue,
        businessAccountId,
      });
    }
  }

  return changes;
}

export function getContactName(value: MetaWebhookValue): string | null {
  if (!Array.isArray(value.contacts)) {
    return null;
  }

  const contact = value.contacts[0];

  if (!contact || typeof contact !== "object") {
    return null;
  }

  const profile = (contact as Record<string, unknown>).profile;

  if (!profile || typeof profile !== "object") {
    return null;
  }

  const name = readString((profile as Record<string, unknown>).name, 150);
  return name || null;
}

export function getPhoneNumberId(value: MetaWebhookValue): string {
  return readString(value.metadata?.phone_number_id, 100);
}

export function readMetaMessages(value: MetaWebhookValue): MetaMessage[] {
  return Array.isArray(value.messages)
    ? (value.messages.filter(
        (message): message is MetaMessage =>
          Boolean(message && typeof message === "object"),
      ) as MetaMessage[])
    : [];
}

export function readMetaStatuses(value: MetaWebhookValue): MetaStatus[] {
  return Array.isArray(value.statuses)
    ? (value.statuses.filter(
        (status): status is MetaStatus =>
          Boolean(status && typeof status === "object"),
      ) as MetaStatus[])
    : [];
}

export function readMetaMessageEchoes(
  value: MetaWebhookValue,
): MetaMessageEcho[] {
  return Array.isArray(value.message_echoes)
    ? (value.message_echoes.filter(
        (message): message is MetaMessageEcho =>
          Boolean(message && typeof message === "object"),
      ) as MetaMessageEcho[])
    : [];
}

export function readWebhookString(
  value: unknown,
  maximumLength = 500,
): string {
  return readString(value, maximumLength);
}
