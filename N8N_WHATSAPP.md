# WhatsApp + n8n — cómo se conecta el portal

El portal **no habla con WhatsApp directamente**: n8n es el puente. El portal guarda los chats,
decide si la IA puede responder y le pide a n8n que envíe mensajes o agende citas.

```
WhatsApp ──► n8n ──► POST /whatsapp/n8n/messages ──► Portal (bandeja del vendedor)
                 ◄── { ai_enabled }  (¿responde la IA?)

Portal (vendedor responde / agenda / apaga IA) ──► webhook de n8n ──► WhatsApp / Calendar
```

Toda la comunicación usa **una sola clave**: `N8N_API_KEY` del `backend/.env`, en el header
`X-N8N-API-Key`. n8n la envía al llamar al portal, y el portal la envía al llamar a tus webhooks
(configura el nodo Webhook con *Header Auth* para validarla).

Base URL de la API: `https://portal.ertweb.com/api/v1`

---

## 1. n8n → Portal

### 1.1 Registrar cada mensaje — `POST /whatsapp/n8n/messages`

Llámalo **por cada mensaje entrante**, antes de pasarlo a la IA, y otra vez con la **respuesta de la IA**
para que el vendedor vea la conversación completa.

```json
{
  "phone": "584121234567",          // también acepta "+58 412-1234567" o "584121234567@s.whatsapp.net"
  "name": "María Pérez",            // opcional (pushName)
  "text": "Hola, quiero una web",
  "direction": "in",                // "in" = lo escribió el contacto · "out" = lo envió la IA
  "wa_message_id": "wamid.XXXX",    // opcional pero recomendado: evita duplicados si n8n reintenta
  "media_url": null,                // opcional
  "media_type": null                // opcional: image, audio, document...
}
```

Respuesta:

```json
{ "conversation_id": "…", "message_id": "…", "duplicate": false, "ai_enabled": true, "stage": "new" }
```

**`ai_enabled` es lo que debes revisar**: pon un nodo **IF** después de esta llamada.
- `true` → el mensaje sigue al agente de IA.
- `false` → el flujo termina ahí (un vendedor pausó la IA en ese chat, o la IA está apagada para todos).

Si el número es nuevo, la conversación se crea sola y aparece en la bandeja y en el pipeline como «Nuevo».

### 1.2 Consultar la IA sin registrar nada — `GET /whatsapp/n8n/ai-status?phone=584121234567`

```json
{ "ai_enabled": false, "global_ai_enabled": true, "conversation_ai_enabled": false, "conversation_id": "…" }
```

### 1.3 Pausar o activar la IA desde n8n — `PUT /whatsapp/n8n/ai-status`

Cuando el bot se apaga por su cuenta (comando `DESACTIVAR BOT`, fusible anti-bucle), avísale al portal para
que el vendedor vea el mismo estado:

```json
{ "phone": "584121234567", "ai_enabled": false }
```

Un chat cuyo número coincide con el `phone` de una cuenta de cliente queda vinculado a esa cuenta
automáticamente: al registrar clientes desde n8n envía siempre `phone` en `POST /users/`.

---

## 2. Portal → n8n (webhooks que debes crear)

Las rutas se configuran en `backend/.env` y se concatenan a `N8N_WEBHOOK_BASE_URL`.
Si ya tienes workflows con otra ruta, **cambia la variable** en vez de renombrar el workflow.

### 2.1 El vendedor responde un chat — `N8N_WA_SEND_PATH` (default `/webhook/whatsapp-send`)

```json
{
  "event": "whatsapp_send",
  "conversation_id": "…", "message_id": "…",
  "phone": "584121234567", "contact_name": "María Pérez",
  "text": "Hola María, soy Vera de ErtWeb",
  "agent_id": "…", "agent_name": "Vera Rojas"
}
```

El workflow envía `text` a `phone` por WhatsApp y **responde 200**. Si responde otro código (o no responde
en 10 s) el vendedor ve «No enviado» y puede reintentar. No vuelvas a registrar este mensaje con
`/whatsapp/n8n/messages`: el portal ya lo guardó.

### 2.2 El vendedor agenda una cita — `N8N_WA_SCHEDULE_PATH` (default `/webhook/whatsapp-schedule`)

Aquí conectas tu workflow de agendamiento existente.

```json
{
  "event": "whatsapp_schedule",
  "appointment_id": "…", "conversation_id": "…",
  "phone": "584121234567", "contact_name": "María Pérez",
  "title": "Llamada de descubrimiento", "notes": null,
  "appointment_date": "2026-10-09", "time_slot": "10:00 AM",
  "start_datetime": "2026-10-09T10:00:00", "timezone": "America/Caracas",
  "duration_minutes": 30,
  "agent_name": "Vera Rojas", "agent_email": "vera@ertweb.com"
}
```

Si el workflow responde con `{"meeting_link": "https://meet.google.com/…"}` (o `hangoutLink`), el link
queda guardado en la cita. Si el link se genera después, guárdalo con
`PUT /appointments/{appointment_id}` y body `{"meeting_link": "…"}` (acepta `X-N8N-API-Key`).

La cita **siempre** queda guardada en la agenda del portal; si n8n falla, el vendedor ve el aviso de que
no se creó en el calendario.

### 2.3 Se activó o pausó la IA — `N8N_WA_AI_TOGGLE_PATH` (default `/webhook/whatsapp-ai-toggle`) — opcional

```json
{ "scope": "conversation", "phone": "584121234567", "conversation_id": "…", "ai_enabled": false, "changed_by": "vera@ertweb.com" }
{ "scope": "global", "ai_enabled": false, "changed_by": "vera@ertweb.com" }
```

Solo es un aviso. No hace falta crearlo si tu flujo ya revisa `ai_enabled` en el paso 1.1
(el portal ignora el error si el webhook no existe).

---

## 3. Si n8n ya agenda citas por su cuenta (la IA agenda sola)

Para que esas citas aparezcan en la Agenda del portal, que el workflow las registre:

```
POST /appointments/
X-N8N-API-Key: …

{ "title": "Llamada", "appointment_date": "2026-10-09", "time_slot": "10:00 AM",
  "duration_minutes": 30, "meeting_link": "https://meet.google.com/…",
  "contact_name": "María Pérez", "contact_phone": "584121234567" }
```

Usa `client_id` en lugar de `contact_*` si la persona ya es cliente del portal (así le aparece en su Agenda).

---

## 4. Lo que hace el vendedor en el portal

| Acción | Dónde | Qué pasa |
|---|---|---|
| Ver y responder chats | WhatsApp | Lee lo que registra n8n; responder dispara 2.1 |
| Pausar / activar la IA en un chat | Panel derecho del chat | `ai_enabled=false` para ese número |
| Apagar la IA para todos | Interruptor arriba de la bandeja | `ai_enabled=false` para cualquier número |
| Mover el lead de etapa | Pipeline o panel del chat | Nuevo → Contactado → Negociación → Propuesta → Venta cerrada / Perdido |
| Agendar una cita | Botón «Agendar cita» del chat | Guarda la cita y dispara 2.2 |
| Crear la cuenta del cliente | Botón «Crear cuenta de cliente» | Crea un usuario `client` con ese teléfono y marca la venta como cerrada |

Probar sin WhatsApp:

```bash
curl -X POST https://portal.ertweb.com/api/v1/whatsapp/n8n/messages \
  -H "X-N8N-API-Key: $N8N_API_KEY" -H "Content-Type: application/json" \
  -d '{"phone":"584121234567","name":"Prueba","text":"Hola"}'
```
