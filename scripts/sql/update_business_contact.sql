-- Ejecutar una sola vez en Supabase SQL Editor para actualizar
-- el número activo de la empresa en producción.
UPDATE public.business_settings
SET
  phone = '+593 99 515 2308',
  whatsapp_number = '593995152308',
  updated_at = now()
WHERE code = 'plastimad';

SELECT
  code,
  phone,
  whatsapp_number,
  updated_at
FROM public.business_settings
WHERE code = 'plastimad';
