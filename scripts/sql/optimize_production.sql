-- Additive and repeatable. Does not delete or rewrite existing business data.
-- Apply BEFORE deploying the corresponding application version.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS bot_reply_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS bot_handoff_at timestamp with time zone;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS bot_paused boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS messages_automation_reply_unique
ON public.conversation_messages (reply_to_meta_message_id)
WHERE origin = 'CLOUD_AUTOMATION';

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key_hash text PRIMARY KEY,
  window_start timestamp with time zone NOT NULL,
  hits integer NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS api_rate_limits_window_idx ON public.api_rate_limits(window_start);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.order_requests (
  request_id uuid PRIMARY KEY,
  payload_hash text NOT NULL,
  order_id integer NOT NULL REFERENCES public.orders(id),
  response jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_requests FROM anon, authenticated;
COMMIT;
