# Configuración de WhatsApp Cloud API — Plastimad

## Arquitectura

```text
WhatsApp Business del teléfono empresarial
        + coexistencia oficial al final
                    │
                    ▼
          WhatsApp Cloud API (Meta)
                    │
                    ▼
https://plastimadshop.com/api/whatsapp/webhook
                    │
                    ▼
          Next.js alojado en Netlify
                    │
                    ▼
      Supabase: conversaciones y mensajes
                    │
                    ▼
        /crm/whatsapp para el personal
```

## Horario configurado

- Atención humana: lunes a sábado, 08:00–17:00.
- Zona horaria: `America/Guayaquil`.
- El asistente automático puede responder las 24 horas.
- Fuera del horario informa que un asesor continuará en la siguiente jornada.
- Cuando el cliente solicita un asesor, la conversación cambia a `HUMANO` y el bot se detiene.
- Cuando un empleado responde desde WhatsApp Business en coexistencia, el webhook `smb_message_echoes` cambia automáticamente la conversación a `HUMANO`.

## Rutas incorporadas

- Webhook: `/api/whatsapp/webhook`
- Estado técnico: `/api/whatsapp/health`
- Bandeja CRM: `/crm/whatsapp`
- Detalle: `/crm/whatsapp/[id]`

## Variables privadas de Netlify

```env
WHATSAPP_VERIFY_TOKEN="..."
WHATSAPP_ACCESS_TOKEN="..."
WHATSAPP_PHONE_NUMBER_ID="..."
WHATSAPP_BUSINESS_ACCOUNT_ID="..."
META_APP_SECRET="..."
WHATSAPP_GRAPH_API_VERSION="v24.0"
WHATSAPP_AUTO_REPLY_ENABLED="true"
```

No usar `NEXT_PUBLIC_` en estas variables.

## Generar el token de verificación

Desde la raíz del proyecto:

```bat
node scripts\generate-whatsapp-verify-token.mjs
```

Guarde el resultado en Netlify como `WHATSAPP_VERIFY_TOKEN`. El mismo valor se pega en Meta al configurar el webhook.

## Base de datos

Ejecutar en Supabase SQL Editor:

```text
scripts/sql/setup_whatsapp_cloud_api.sql
```

Este script agrega campos de WhatsApp, índices de idempotencia y el horario de atención. No elimina pedidos, leads ni conversaciones existentes.

## Configuración del webhook en Meta

- Callback URL: `https://plastimadshop.com/api/whatsapp/webhook`
- Verify token: el valor generado localmente.
- Suscribir inicialmente el campo `messages`.
- Cuando se configure coexistencia, suscribir también `smb_message_echoes` si aparece disponible.

## Pruebas

1. Abrir `https://plastimadshop.com/api/whatsapp/health` y comprobar `ok: true`.
2. En Meta, enviar el mensaje de prueba al destinatario autorizado.
3. Escribir al número temporal de Meta desde el teléfono autorizado.
4. Confirmar que la conversación aparece en `/crm/whatsapp`.
5. Consultar `precios`, `entrega`, `pagos` y `horario`.
6. Escribir `asesor` y confirmar que el modo cambia a `HUMANO`.
7. Reactivar el bot desde el CRM.
8. Revisar estados `SENT`, `DELIVERED` y `READ`.

## Número empresarial real

No registrar todavía `+593 99 515 2308` mediante la migración tradicional. La conexión final debe hacerse mediante coexistencia oficial para conservar la aplicación WhatsApp Business. Meta exige que el onboarding de coexistencia se realice como Solution Partner o Tech Provider, por lo que esta fase se evalúa después de validar completamente el número temporal.
