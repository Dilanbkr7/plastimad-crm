# Cambios realizados: contacto empresarial

## Número sustituido

- Número de pruebas eliminado: `0999936165` / `593999936165`
- Número empresarial visible: `+593 99 515 2308`
- Número técnico de WhatsApp: `593995152308`

## Mejoras incorporadas

1. Utilidades centralizadas en `lib/whatsapp.ts` para normalizar, validar, mostrar y crear enlaces de WhatsApp.
2. Los pedidos usan el número configurado en la base de datos y validan el enlace antes de redirigir.
3. La landing, el asistente y los enlaces del CRM usan la misma función central.
4. Nueva pantalla protegida `/crm/settings` para cambiar el número en el futuro sin editar código.
5. Script SQL de actualización para producción en `scripts/sql/update_business_contact.sql`.
6. Auditoría no destructiva del antiguo número en `scripts/sql/audit_test_phone.sql`.
7. Datos iniciales actualizados en `drizzle/seed_plastimad.sql`.
8. El número de pruebas fue eliminado de los archivos fuente.

## Acción única en la base de datos activa

Ejecutar `scripts/sql/update_business_contact.sql` en Supabase SQL Editor. El cambio se refleja en la landing y en los pedidos porque la aplicación consulta `business_settings` en tiempo de ejecución.
