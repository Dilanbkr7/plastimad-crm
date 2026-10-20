-- Additive and repeatable. Historical orders retain NULL billing details.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS billing_document_type varchar(10),
  ADD COLUMN IF NOT EXISTS billing_document_number varchar(13);
