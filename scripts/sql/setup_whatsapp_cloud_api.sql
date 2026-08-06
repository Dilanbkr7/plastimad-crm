-- Configuración idempotente de WhatsApp Cloud API para Plastimad.
-- Ejecutar una sola vez desde Supabase > SQL Editor.
-- Puede volver a ejecutarse: usa IF NOT EXISTS y actualizaciones seguras.

BEGIN;

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS support_timezone varchar(64) NOT NULL DEFAULT 'America/Guayaquil',
  ADD COLUMN IF NOT EXISTS support_days varchar(20) NOT NULL DEFAULT '1,2,3,4,5,6',
  ADD COLUMN IF NOT EXISTS support_open_time varchar(5) NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS support_close_time varchar(5) NOT NULL DEFAULT '17:00';

UPDATE public.business_settings
SET
  support_timezone = 'America/Guayaquil',
  support_days = '1,2,3,4,5,6',
  support_open_time = '08:00',
  support_close_time = '17:00',
  updated_at = now()
WHERE code = 'plastimad';

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS contact_name varchar(150),
  ADD COLUMN IF NOT EXISTS whatsapp_wa_id varchar(32),
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id varchar(64),
  ADD COLUMN IF NOT EXISTS whatsapp_mode varchar(20) NOT NULL DEFAULT 'AUTOMATICO',
  ADD COLUMN IF NOT EXISTS last_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_outbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_service_window_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS human_since timestamptz;

ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS meta_message_id varchar(255),
  ADD COLUMN IF NOT EXISTS direction varchar(20),
  ADD COLUMN IF NOT EXISTS message_type varchar(40),
  ADD COLUMN IF NOT EXISTS delivery_status varchar(30),
  ADD COLUMN IF NOT EXISTS origin varchar(30),
  ADD COLUMN IF NOT EXISTS reply_to_meta_message_id varchar(255),
  ADD COLUMN IF NOT EXISTS error_code varchar(50),
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS failed_at timestamptz;

UPDATE public.conversation_messages
SET direction = CASE
  WHEN role = 'USER' THEN 'INBOUND'
  WHEN role = 'ASSISTANT' THEN 'OUTBOUND'
  ELSE 'SYSTEM'
END
WHERE direction IS NULL;

UPDATE public.conversation_messages
SET
  message_type = COALESCE(message_type, 'text'),
  delivery_status = COALESCE(delivery_status, 'REGISTERED'),
  origin = COALESCE(
    origin,
    CASE
      WHEN role = 'USER' THEN 'WEB_CUSTOMER'
      WHEN role = 'ASSISTANT' THEN 'WEB_ASSISTANT'
      ELSE 'SYSTEM'
    END
  )
WHERE message_type IS NULL
   OR delivery_status IS NULL
   OR origin IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_whatsapp_wa_id_unique
  ON public.conversations (whatsapp_wa_id);

CREATE INDEX IF NOT EXISTS conversations_channel_mode_idx
  ON public.conversations (channel, whatsapp_mode);

CREATE INDEX IF NOT EXISTS conversations_last_inbound_idx
  ON public.conversations (last_inbound_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_messages_meta_message_id_unique
  ON public.conversation_messages (meta_message_id);

CREATE INDEX IF NOT EXISTS conversation_messages_delivery_status_idx
  ON public.conversation_messages (delivery_status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conversations_whatsapp_mode_check'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT conversations_whatsapp_mode_check
      CHECK (whatsapp_mode IN ('AUTOMATICO', 'HUMANO', 'CERRADO'));
  END IF;
END
$$;

COMMIT;

SELECT
  code,
  support_timezone,
  support_days,
  support_open_time,
  support_close_time
FROM public.business_settings
WHERE code = 'plastimad';
