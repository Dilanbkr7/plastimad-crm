-- Auditoría no destructiva del antiguo número de pruebas.
-- No modifica ni elimina registros.

SELECT
  'business_settings' AS source_table,
  id::text AS record_id,
  business_name AS record_name,
  phone AS stored_phone
FROM public.business_settings
WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g')
      IN ('0999936165', '593999936165')
   OR regexp_replace(coalesce(whatsapp_number, ''), '\D', '', 'g')
      IN ('0999936165', '593999936165')

UNION ALL

SELECT
  'customers' AS source_table,
  id::text AS record_id,
  name AS record_name,
  phone AS stored_phone
FROM public.customers
WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g')
      IN ('0999936165', '593999936165')

UNION ALL

SELECT
  'leads' AS source_table,
  id::text AS record_id,
  coalesce(name, 'Lead sin nombre') AS record_name,
  phone AS stored_phone
FROM public.leads
WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g')
      IN ('0999936165', '593999936165')

ORDER BY source_table, record_id;
