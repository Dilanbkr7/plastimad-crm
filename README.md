# Plastimad CRM

Aplicación de producción de Plastimad construida con Next.js 16, Supabase, PostgreSQL y Drizzle ORM. Incluye landing comercial, registro de pedidos, redirección a WhatsApp, asistente de consultas y CRM protegido por autenticación.

La guía actual de despliegue, respaldo, caché y límites del bot está en [OPERACION_PRODUCCION.md](OPERACION_PRODUCCION.md). La migración aditiva indicada allí debe aplicarse antes de publicar esta versión.

## Arquitectura

```text
plastimadshop.com
        ↓
Netlify + Next.js
        ↓
Supabase Auth + PostgreSQL
        ↓
Landing, pedidos, leads y CRM
```

## Variables de entorno

Copia `.env.example` como `.env.local` y completa los valores reales. No subas `.env.local` al repositorio.

Variables requeridas:

```text
DATABASE_URL
MIGRATION_DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_NAME
```

El número empresarial no se guarda en variables de entorno. Se administra centralmente en la tabla `business_settings` y desde `/crm/settings`.

## Números de WhatsApp

```text
Cloud API y pedidos: +593 98 433 2620 (593984332620)
Equipo comercial:   +593 99 515 2308 (593995152308)
```

El número Cloud API se conserva en `business_settings` y en la configuración de Meta. El enlace del equipo comercial está separado en `lib/commercial.ts`. No ejecutar el antiguo `update_business_contact.sql`: sustituye el contacto de la landing y mezclaría ambos destinos.

Para comprobar si el antiguo número de pruebas quedó guardado en clientes o leads históricos, ejecuta la auditoría no destructiva:

```text
scripts/sql/audit_test_phone.sql
```

Después del despliegue también puede modificarse desde:

```text
https://plastimadshop.com/crm/settings
```

Un único cambio actualiza:

- número visible en la landing;
- botones de WhatsApp;
- destinatario de pedidos;

El enlace de derivación del asistente comercial se mantiene separado. El bot de WhatsApp responde dos consultas y en la tercera entrega ese enlace; solicitar asesor o enviar multimedia deriva inmediatamente.

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Validaciones

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Despliegue en Netlify

1. Subir los cambios al repositorio conectado con Netlify.
2. Confirmar las variables de entorno en Netlify.
3. Ejecutar un nuevo despliegue desde la rama `main`.
4. Probar en ventana privada:
   - `https://plastimadshop.com`;
   - `https://plastimadshop.com/login`;
   - `https://plastimadshop.com/crm`;
   - `https://plastimadshop.com/crm/settings`;
   - creación de pedido y redirección a WhatsApp.

## Seguridad

- `DATABASE_URL` y `MIGRATION_DATABASE_URL` son privadas.
- La clave `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` puede usarse en navegador, pero las tablas deben estar protegidas con RLS cuando se acceden directamente desde Supabase.
- Las rutas `/crm/*` verifican la sesión de Supabase.
- No incluir `.env.local`, `node_modules`, `.next` ni credenciales en archivos ZIP o commits.

## WhatsApp Cloud API

El número público y los enlaces `wa.me` ya están centralizados. La integración con Cloud API debe agregarse después mediante webhook y, para conservar la aplicación WhatsApp Business del teléfono, usando el flujo oficial de coexistencia. No registrar el número empresarial mediante una migración tradicional.
