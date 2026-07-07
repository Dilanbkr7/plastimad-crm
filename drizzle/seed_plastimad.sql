BEGIN;

-- =========================================================
-- 1. CONFIGURACIÓN GENERAL DE PLASTIMAD
-- =========================================================

INSERT INTO public.business_settings (
  code,
  business_name,
  legal_name,
  phone,
  whatsapp_number,
  email,
  logo_url,
  primary_color,
  secondary_color,
  dark_color,
  free_delivery_enabled,
  free_delivery_city,
  updated_at
)
VALUES (
  'plastimad',
  'Plastimad',
  'Plasticmadera Ecuador S.A.S.',
  '0999936165',
  '593999936165',
  NULL,
  NULL,
  '#12B83E',
  '#A66A21',
  '#075E35',
  true,
  'Quito',
  now()
)
ON CONFLICT (code)
DO UPDATE SET
  business_name = EXCLUDED.business_name,
  legal_name = EXCLUDED.legal_name,
  phone = EXCLUDED.phone,
  whatsapp_number = EXCLUDED.whatsapp_number,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  dark_color = EXCLUDED.dark_color,
  free_delivery_enabled =
    EXCLUDED.free_delivery_enabled,
  free_delivery_city =
    EXCLUDED.free_delivery_city,
  updated_at = now();

-- =========================================================
-- 2. PRODUCTO ECO MACETA CNC
-- =========================================================

WITH product_row AS (
  INSERT INTO public.products (
    slug,
    name,
    short_description,
    description,
    base_price_cents,
    active,
    updated_at
  )
  VALUES (
    'eco-maceta-cnc',
    'Eco Maceta CNC',
    'Maceta fabricada con plástico reciclado.',
    'Producto sostenible de Plastimad, diseñado para espacios interiores y exteriores.',
    5500,
    true,
    now()
  )
  ON CONFLICT (slug)
  DO UPDATE SET
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
    base_price_cents = EXCLUDED.base_price_cents,
    active = EXCLUDED.active,
    updated_at = now()
  RETURNING id
)

INSERT INTO public.offers (
  product_id,
  name,
  quantity,
  price_cents,
  featured,
  active,
  sort_order,
  updated_at
)

SELECT
  id,
  '1 Eco Maceta',
  1,
  5500,
  false,
  true,
  1,
  now()
FROM product_row

UNION ALL

SELECT
  id,
  'Combo de 2 Eco Macetas',
  2,
  8500,
  true,
  true,
  2,
  now()
FROM product_row

UNION ALL

SELECT
  id,
  'Combo de 3 Eco Macetas',
  3,
  10500,
  false,
  true,
  3,
  now()
FROM product_row

ON CONFLICT (product_id, quantity)
DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  featured = EXCLUDED.featured,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- =========================================================
-- 3. MODALIDADES INICIALES DE ENTREGA
-- =========================================================

INSERT INTO public.delivery_zones (
  code,
  name,
  province,
  city,
  sector,
  delivery_type,
  delivery_fee_cents,
  free_delivery,
  requires_quote,
  cash_on_delivery_available,
  active,
  updated_at
)
VALUES
(
  'quito-local',
  'Quito - entrega gratuita',
  'Pichincha',
  'Quito',
  NULL,
  'LOCAL',
  0,
  true,
  false,
  true,
  true,
  now()
),
(
  'provincias-courier',
  'Provincias - envío por courier',
  NULL,
  NULL,
  NULL,
  'COURIER',
  0,
  false,
  true,
  false,
  true,
  now()
)
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  province = EXCLUDED.province,
  city = EXCLUDED.city,
  sector = EXCLUDED.sector,
  delivery_type = EXCLUDED.delivery_type,
  delivery_fee_cents =
    EXCLUDED.delivery_fee_cents,
  free_delivery = EXCLUDED.free_delivery,
  requires_quote = EXCLUDED.requires_quote,
  cash_on_delivery_available =
    EXCLUDED.cash_on_delivery_available,
  active = EXCLUDED.active,
  updated_at = now();

COMMIT;