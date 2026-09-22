# Operación de Plastimad

## Números y recorrido

- Cloud API existente: +593 98 433 2620. Se conserva la configuración de Meta y Netlify.
- Equipo comercial: +593 99 515 2308, https://wa.me/593995152308. La constante está separada en `lib/commercial.ts`.
- WhatsApp responde dos consultas. En la tercera interacción entrega el enlace comercial y no vuelve a responder automáticamente.
- Solicitar asesor o enviar audio, imagen, documento u otro contenido deriva inmediatamente.
- Reacciones no consumen respuestas. Botones/listas se interpretan como texto.
- El límite se guarda por conversación en PostgreSQL; no se reinicia con despliegues ni paso del tiempo.
- En CRM, **Automático** reinicia el contador. **Humano** o **Cerrado** pausa el bot. Responder desde CRM o Business App también lo pausa.
- Las conversaciones antiguas escaladas automáticamente reciben el enlace en su próximo mensaje si no hay una pausa manual nueva.
- Los contactos entrantes se vinculan a leads. No se inventa consentimiento de marketing. Los históricos se conservan; no se realiza una importación masiva retroactiva.

## Ahorro

- Imágenes WebP en `public/plastimad/optimized-v1`, aproximadamente 262 KB entre las cuatro. Los PNG originales se conservan.
- La carpeta optimizada tiene caché inmutable de un año: para reemplazar imágenes se debe publicar otra versión de carpeta.
- Portada y consultas de catálogo: caché de 300 segundos. Cambiar el número desde Configuración invalida la caché inmediatamente.
- El precio de cada pedido nuevo se valida contra la base de datos, sin usar la caché de la portada.
- Pedidos, sesiones, conversaciones y multimedia privada no se almacenan en caché pública.
- El proxy de sesión solo cubre CRM, acceso y API protegidas.
- Audios y videos privados no se descargan hasta reproducirlos; imágenes privadas usan carga diferida.
- No hay consultas periódicas ni tareas programadas de sondeo.

## Datos y errores

- Cada mensaje entrante y su respuesta pendiente se guardan en una misma transacción.
- Duplicados de Meta no incrementan el contador ni duplican leads/respuestas.
- Las respuestas pendientes se recuperan cuando Meta reintenta el webhook. Rechazos temporales permiten hasta tres intentos.
- Un envío sin confirmación se marca UNKNOWN: no se reenvía a ciegas, para evitar duplicados. Revisar en Meta y atender manualmente desde el CRM.
- Estados PENDING, RETRY, FAILED, UNKNOWN y CANCELLED se muestran en el historial. No hay una cola externa con garantía de entrega ilimitada.
- Los pedidos usan Idempotency-Key y una respuesta persistida para evitar duplicados al reintentar el mismo formulario sin recargarlo.
- Los límites de solicitudes son compartidos entre instancias: pedidos 6/minuto por IP, chat 20/minuto; cada ruta tiene un tope global de 300/minuto. Ajustar con tráfico real, considerando redes compartidas.
- La API multimedia exige un empleado activo y que el archivo pertenezca a una conversación registrada.

## Despliegue y recuperación

1. `npm ci`, `npm run lint`, `npm test`, `npm run build`.
2. `node scripts/backup-business.mjs`: respaldo local de tablas públicas en `.backups`, excluido de Git. Incluye datos privados: guardarlo en una ubicación segura. No reemplaza un respaldo completo de Supabase Auth/Storage.
3. `node scripts/apply-optimization.mjs`: migración aditiva, transaccional y repetible; no cambia números ni elimina registros. Debe ejecutarse ANTES de desplegar esta versión. No usar `drizzle push` para sustituir este paso.
4. Publicar una previsualización y comprobar portada, archivos, login, rutas protegidas y salud de WhatsApp.
5. Publicar a producción una sola vez y repetir las comprobaciones.
6. Si hay un fallo de despliegue, restaurar el deploy anterior desde Netlify. Las columnas/tablas añadidas son compatibles con el código anterior; dejarlas en la base. No restaurar un respaldo antiguo encima de pedidos nuevos.
7. La restauración de datos desde un respaldo requiere revisar tabla, claves y registros afectados antes de ejecutar escrituras. No hay un botón de restauración automática en esta aplicación.

Prueba de integración opcional: definir `RUN_DATABASE_TESTS=1` y ejecutar `npm test`. Las filas de prueba se revierten; no envía WhatsApp. Las secuencias pueden avanzar, lo cual no elimina registros.

## Campañas y créditos

- Auditoría del panel realizada el 22/09/2026: período 22/08–21/09, 395 créditos. El gráfico atribuye al 10/09 un pico de 276 créditos de bandwidth, 4,9 de solicitudes y 1,1 de funciones; no registra inferencia de IA. El gráfico de transferencia muestra 14,7 GB ese día. Las cifras entre gráficas tienen redondeos y límites de fecha distintos; no tratarlas como una conciliación contable exacta.
- La transferencia del período se concentra en `plastimadshop.com`. Esto confirma el rubro que agotó los créditos; el panel disponible no permite atribuir cada byte a una imagen, identificar visitantes reales frente a bots ni demostrar por sí solo que todo provino de la campaña.
- Las cuatro imágenes originales sumaban 7.620.750 bytes; las optimizadas suman 261.632 bytes (reducción de 96,6 % en esos archivos, no en toda la factura). Cada despliegue de producción también consume créditos: agrupar cambios y validar en previsualización antes de publicar.
- El píxel solo se carga en la portada. Contact mide clic a WhatsApp; Lead mide un contacto web o pedido efectivamente guardado. No se emite Purchase por pedidos aún no pagados.
- Estos eventos del navegador pueden ser bloqueados por el visitante. Los leads de WhatsApp se guardan en el CRM; no hay atribución automática de anuncios ni Conversions API en esta versión.
- Revisar Netlify → Usage & billing → Credit usage breakdown y el gráfico diario. El gasto incluye todos los sitios del equipo.
- No se modifican recargas automáticas, compras ni alertas de facturación. El cliente debe revisar los avisos de 50 %, 75 % y 100 %; al agotarse el saldo Netlify puede pausar el sitio.
- La optimización reduce el consumo, pero no garantiza disponibilidad absoluta ni recuperación de medios que Meta ya haya expirado.
