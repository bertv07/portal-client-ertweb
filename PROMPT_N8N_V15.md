# Encargo: ERTWeb Bot v15 — conectar con el portal + automatizar Instagram

Vas a modificar el workflow de n8n **"ERTWeb Bot v14 - Anti-bucle"** (te adjunto su JSON) y a crear lo que falte.
Entrega el JSON completo de cada workflow nuevo o modificado, listo para importar, más el SQL de las tablas nuevas.

## Reglas generales

- **No rompas lo que ya funciona**: cola con agrupado de mensajes, fusible anti-bucle, aprobación de precios por el jefe, asistente del jefe, comandos `FACTURA FINAL` y `ACTIVAR/DESACTIVAR BOT`.
- **Ningún secreto escrito en los nodos.** Hoy la API key del portal y el token de Chatwoot están pegados en texto plano en ~30 nodos. Crea dos credenciales *Header Auth* (`Portal ERTWeb` → header `X-N8N-API-Key`; `Chatwoot` → header `api_access_token`) y úsalas en todos los nodos HTTP. Yo pongo los valores.
- Todo lo que yo deba completar a mano déjalo en **un solo nodo Set llamado `CONFIG`** al inicio de cada flujo, y lístalo al final de tu respuesta.
- Toda consulta SQL con datos externos debe escapar comillas (`.replace(/'/g, "''")`) o usar parámetros.
- Base del portal: `https://api.ertweb.com/api/v1`. Las rutas de colección llevan **slash final** (`/appointments/`, `/maintenance/`, `/invoices/`, `/users/`); sin él FastAPI redirige y el POST puede perderse.

---

## PARTE A — Arreglos al flujo actual

1. **`Jefe Buscar Clientes`** llama `GET /users/clients`, que no existe. Cámbialo a `GET /users/?role=client`.
2. **`Agendar Cita Portal`, `Jefe Agendar Cita`, `Registrar Mantenimiento`, `Jefe Registrar Mantenimiento`, `Todas Las Citas`, `Citas Hoy Resumen`**: agrega el slash final a la URL.
3. **`Agendar Cita Portal`** hoy solo sirve si el cliente está vinculado. Si `vinculado = NO`, envía `contact_name` y `contact_phone` (el teléfono del chat) en lugar de `client_id`; el portal acepta citas de leads sin cuenta. Actualiza la descripción de la herramienta y el prompt del agente para que agende también a leads.
4. **Aprobaciones que se pisan**: `Marcar Resuelta` y `Cerrar Aprobacion` hacen `UPDATE aprobaciones_pendientes SET resuelto = true WHERE resuelto = false`, es decir, al aprobar una cotización se cierran todas las demás. Deben cerrar **solo el `id`** de la aprobación que se resolvió.
5. **`Guardar Aprobacion`** inserta `cliente_telefono` y `resume_url` sin escapar. Corrígelo.
6. **`Avisar Fusible`** está desactivado: el bot se apaga solo y nadie se entera. Actívalo.
7. **`Cron Recordatorio Citas` y `Cron Facturas Diario`** están desactivados. Actívalos (el portal ya permite `GET /invoices/` y `GET /appointments/` con la API key). En ambos, si `Conversacion` es `null`, no envíes nada.
8. **Placeholders sin completar** que debes mover a `CONFIG` y avisarme: workflow `VINCULAR CLIENTE PORTAL`, workflow `EXPORTAR EXCEL PARA JEFE`, documento y hojas de `ERTWeb Lista Precios 2026` (4 nodos), y el texto `TU_CORREO_AIRTM` dentro del prompt de `AI Agent4` (hoy el bot se lo diría literalmente al cliente: si `CONFIG.airtm_email` está vacío, que no ofrezca Airtm).
9. **`Jefe Consultar BD`** ejecuta el SQL que escriba la IA con la credencial normal. Indícame cómo crear un usuario de Postgres de solo lectura y usa esa credencial en ese nodo y en el de exportar a Excel.
10. **Sub-workflow `REGISTRAR CLIENTE Y PROYECTO V2`**: al crear la cuenta con `POST /users/` envía también `"phone": "<teléfono del chat>"`. El portal usa ese teléfono para vincular el chat de WhatsApp con la cuenta.

---

## PARTE B — Conectar WhatsApp con el portal (bandeja del vendedor)

El portal tiene ahora una bandeja de WhatsApp para vendedores. No habla con WhatsApp: n8n le reporta los mensajes y el portal le pide a n8n que envíe. Todas las llamadas al portal usan la credencial `Portal ERTWeb`.

### B1. Reportar cada mensaje ENTRANTE

En la rama de clientes, justo antes de `Guardar en Cola` (las tres entradas: texto, nota de voz transcrita, imagen analizada), agrega un HTTP:

```
POST /whatsapp/n8n/messages
{
  "phone": "<Telefono>",
  "name": "<body.sender.name de Chatwoot>",
  "text": "<Mensaje>",
  "direction": "in",
  "wa_message_id": "cw-<body.id de Chatwoot>",
  "media_url": "<body.attachments[0].data_url si hay adjunto>",
  "media_type": "<audio | image | file si hay adjunto>"
}
```

Con `onError: continueRegularOutput`: si el portal está caído, el bot sigue funcionando igual.
La respuesta trae `ai_enabled`. **Si es `false`**, guarda el mensaje en `cola_mensajes` con `procesado = true` (para conservar el historial y el `conversacion_id`) y no lo pases a la IA.

### B2. Reportar cada mensaje SALIENTE

Después de cada envío a Chatwoot hacia un cliente (`Enviar a Cliente`, `Enviar Followup`, `Enviar Factura Final Cliente`, `Recordatorio Cita Cliente`, `Aviso Factura Cliente`):

```
POST /whatsapp/n8n/messages
{ "phone": "...", "text": "<lo enviado>", "direction": "out", "sender": "ai", "wa_message_id": "cw-<id que devolvió Chatwoot>" }
```

### B3. Mensajes que un humano escribe directo en Chatwoot

Hoy `Filtrar Eventos` solo deja pasar `incoming`. Agrega una rama para `message_type = outgoing` y `private = false`: espera 5 segundos y repórtalo con `"direction": "out", "sender": "agent", "wa_message_id": "cw-<body.id>"`. El portal descarta duplicados por `wa_message_id`, así los mensajes del bot y del portal (que ya se reportaron con ese mismo id) no se repiten. Esta rama no debe llegar nunca a la cola ni a la IA.

### B4. Webhook nuevo: el vendedor responde desde el portal

`POST /webhook/whatsapp-send` con *Header Auth* (credencial `Portal ERTWeb`). Recibe:

```
{ "event": "whatsapp_send", "conversation_id", "message_id", "phone", "contact_name", "text", "agent_id", "agent_name" }
```

- Busca el `conversacion_id` de Chatwoot más reciente de ese `phone` en `cola_mensajes`.
- Si no existe (número nuevo), crea el contacto y la conversación en Chatwoot en el inbox de WhatsApp (`CONFIG.chatwoot_inbox_id`).
- Envía `text` a esa conversación.
- Responde **200** con `{ "ok": true, "wa_message_id": "cw-<id de Chatwoot>" }`. Si el envío falla responde **500** con el motivo (el vendedor verá "No enviado").
- Modo de respuesta del webhook: *Using Respond to Webhook node*. El portal espera máximo 10 segundos.

### B5. Webhook nuevo: activar / pausar la IA desde el portal

`POST /webhook/whatsapp-ai-toggle` con Header Auth. Recibe `{ "scope": "conversation", "phone", "ai_enabled" }` o `{ "scope": "global", "ai_enabled" }`.

- `conversation`: `ai_enabled = false` → `INSERT INTO bot_apagado (telefono) ... ON CONFLICT DO NOTHING`; `true` → `DELETE FROM bot_apagado` y también `DELETE FROM reintentos_ia` de ese teléfono.
- `global`: guarda el valor en una tabla nueva `bot_config (clave TEXT PRIMARY KEY, valor TEXT)` con clave `ia_global`. `Leer Cola Agrupada` debe devolver cero filas (y marcar los mensajes como procesados) cuando `ia_global = 'false'`.

**Y al revés**, para que el portal muestre lo mismo que el bot: después de `Ejecutar Comando Bot` y de `Apagar por Fusible` llama

```
PUT /whatsapp/n8n/ai-status
{ "phone": "<telefono>", "ai_enabled": true | false }
```

### B6. Webhook nuevo: el vendedor agenda una cita desde el portal

`POST /webhook/whatsapp-schedule` con Header Auth. Recibe:

```
{ "event": "whatsapp_schedule", "appointment_id", "phone", "contact_name", "title", "notes",
  "appointment_date": "2026-10-09", "time_slot": "10:00 AM",
  "start_datetime": "2026-10-09T10:00:00", "timezone": "America/Caracas",
  "duration_minutes": 30, "agent_name", "agent_email" }
```

- Crea el evento en el mismo Google Calendar que usa el bot, con `start_datetime` + `timezone` y la duración indicada, y con videollamada de Meet.
- Responde 200 con `{ "meeting_link": "<link de Meet>" }` (el portal lo guarda en la cita).
- La cita ya quedó guardada en el portal: **no** vuelvas a crearla con `POST /appointments/`.
- Envía al cliente por WhatsApp la confirmación con fecha, hora y link, y repórtala según B2.

---

## PARTE C — Instagram: comentarios y mensajes privados

Objetivo: convertir comentarios en ventas por mensaje privado.

### C0. Antes de construir, dime qué necesito

Explícame paso a paso lo que debo tener listo en Meta: cuenta de Instagram profesional, app en Meta for Developers, permisos de comentarios y de mensajes, suscripción al webhook de `comments` y `messages`, token de larga duración y revisión de la app para operar con cuentas que no son de prueba. **Usa la versión actual de la API de Instagram y verifica en la documentación oficial los nombres exactos de permisos y endpoints**; no los inventes. Si algo de lo que pido no lo permite la API, dímelo y propón la alternativa más cercana.

### C1. Recepción

Un webhook `instagram-eventos` que:
- responda la verificación de Meta (GET con `hub.challenge` y `CONFIG.ig_verify_token`),
- valide la firma de cada POST con el app secret,
- ignore los comentarios hechos por mi propia cuenta (si no, el bot se responde a sí mismo en bucle),
- guarde cada comentario en `ig_comentarios` sin duplicar (clave: id del comentario).

```sql
CREATE TABLE IF NOT EXISTS ig_comentarios (
  comment_id TEXT PRIMARY KEY, media_id TEXT, ig_user_id TEXT, username TEXT, texto TEXT,
  palabra_clave TEXT, respondido_publico BOOLEAN DEFAULT false, dm_enviado BOOLEAN DEFAULT false,
  error TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), respondido_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS ig_palabras_clave (
  palabra TEXT PRIMARY KEY, respuesta_publica TEXT, mensaje_privado TEXT, activo BOOLEAN DEFAULT true
);
```

### C2. Comentario con palabra clave → mensaje privado inmediato

Si el comentario contiene una palabra activa de `ig_palabras_clave` (sin distinguir mayúsculas ni tildes; la primera es **SISTEMA**):

1. Envía al autor un **mensaje privado como respuesta a ese comentario** con el `mensaje_privado` de esa palabra. Solo uno por comentario.
2. Responde el comentario en público con `respuesta_publica` (ej.: "Listo, te escribí al privado").
3. Marca `dm_enviado` y `respondido_publico`.

El texto de cada palabra vive en la tabla, no en el workflow: yo lo cargo y lo cambio por SQL. Déjame un `INSERT` de ejemplo para SISTEMA con un texto provisional que termine en una pregunta (para que la persona conteste y se abra la conversación).

### C3. Comentarios sin palabra clave → respuesta pública a los 2 días

Un cron cada hora toma los comentarios con `respondido_publico = false`, sin palabra clave y con más de `CONFIG.ig_dias_espera` días (por defecto **2**), y responde cada uno en público con una respuesta corta generada por IA según lo que comentó, que invite a comentar la palabra SISTEMA para recibir la información por privado.

- Máximo 20 respuestas por ejecución y una pausa de 20–40 segundos entre cada una.
- No respondas spam, insultos ni comentarios de solo emojis: márcalos como respondidos sin contestar.
- Estilo de ertweb: humano, corto (máx. 25 palabras), sin asteriscos ni comillas; aquí sí se permite un emoji.
- El mensaje privado por comentario tiene una ventana limitada de días desde que se hizo el comentario: confírmala en la documentación y no intentes enviarlo fuera de ella.

### C4. Cuando la persona responde el privado → vender

Los mensajes privados de Instagram deben entrar al **mismo cerebro de ventas** (`AI Agent4`, mismas herramientas de precios, aprobación del jefe y agendamiento), no a un bot aparte.

- Los clientes de Instagram no tienen teléfono y todo el flujo actual usa `telefono` como clave. Usa `ig:<id del usuario>` como identificador en `cola_mensajes`, `seguimiento_leads`, `reintentos_ia`, `bot_apagado` y como `sessionKey` de la memoria.
- Agrega la columna `canal` (`whatsapp` | `instagram`) a `cola_mensajes` y haz que el envío final salga por el canal correcto.
- En Instagram **no** reportes al portal (B1–B3): la bandeja del portal es solo de WhatsApp y exige un teléfono válido.
- En el prompt del agente, cuando el canal sea Instagram: no deduzcas país por prefijo telefónico (pregunta la ciudad si hace falta agendar), y pídele su WhatsApp para enviarle la cotización formal. Cuando lo dé, guárdalo y continúa por WhatsApp.
- Respeta la ventana de mensajería de Instagram: solo se puede escribir en privado dentro del plazo permitido desde el último mensaje de la persona. Si la ventana está cerrada no envíes nada; desactiva el followup de 20 horas para Instagram si cae fuera de ella.
- Si tengo Instagram conectado como canal en Chatwoot, dime si conviene recibir los privados por Chatwoot (reutilizando `Webhook4`) y dejar la API de Instagram solo para los comentarios. Recomiéndame una de las dos y explica por qué.

### C5. Avisos al jefe

Agrega al `Resumen diario`: comentarios recibidos en 24 h, privados enviados por palabra clave y comentarios pendientes de respuesta. Agrega a `Jefe Consultar BD` la descripción de las tablas `ig_comentarios` e `ig_palabras_clave`.

---

## Qué debes entregar

1. JSON del workflow principal v15.
2. JSON de cada workflow nuevo (webhooks del portal, Instagram) y de `VINCULAR CLIENTE PORTAL` si no existe.
3. Un solo bloque SQL con todas las tablas y columnas nuevas (`CREATE ... IF NOT EXISTS` / `ALTER ... ADD COLUMN IF NOT EXISTS`).
4. Lista de credenciales que debo crear y de cada valor de `CONFIG` que debo completar.
5. Guía de configuración de Meta (C0).
6. Plan de prueba: un `curl` por cada webhook nuevo con un cuerpo de ejemplo, y qué debo ver en el portal después.
7. Lista de lo que **no** pudiste hacer o no pudiste verificar.
