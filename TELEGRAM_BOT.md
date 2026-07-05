# Configuración de Telegram Bot con n8n

Esta guía explica paso a paso cómo integrar un Bot de Telegram con tu instancia de n8n para recibir notificaciones inmediatas cada vez que un cliente realice una acción en el portal (subir documentos, programar reuniones, registrar pagos).

---

## 1. Crear el Bot de Telegram
1. Abre Telegram y busca a **@BotFather**.
2. Envía el comando `/newbot`.
3. Sigue las instrucciones para darle un nombre y un usuario a tu bot.
4. Copia el **HTTP API Token** generado. Tendrá un formato similar a este:
   `738291029:AAHGFd3Dsd382_Jkdlas90231920`
5. Haz clic en el enlace de tu bot (ej. `t.me/TuBot`) y envíale un mensaje inicial haciendo clic en **Comenzar** o `/start`.

---

## 2. Obtener tu Chat ID (A dónde se envían los mensajes)
El bot necesita saber a qué chat, grupo o canal enviar las alertas.
* **Si te los envía a ti (Privado):**
  Busca el bot **@userinfobot** en Telegram y envíale un mensaje. Te responderá con tu **Id** numérico (ej. `123456789`).
* **Si se envían a un grupo/canal de administración:**
  1. Agrega a tu bot como administrador del grupo o canal.
  2. Obtén el ID de ese grupo/canal usando un bot como **@RawDataBot** (agregándolo temporalmente). Los IDs de grupo suelen empezar con `-` o `-100`.

---

## 3. Configurar el Workflow en n8n

El portal envía peticiones HTTP a tu instancia de n8n. Puedes configurar un nodo **Webhook** en n8n para recibir estas peticiones y un nodo **Telegram** para enviar el mensaje formateado.

### Estructura de Payload del Webhook (Recepción)
Cuando un cliente realiza una acción (por ejemplo, agenda una reunión), el portal le pega a tu webhook de n8n con el siguiente payload:

```json
{
  "client_id": "usr_123456",
  "client_name": "Juan Pérez",
  "client_email": "client@example.com",
  "meeting_date": "2026-06-30",
  "time_slot": "10:00 AM",
  "topic": "Revisión de diseño de página web",
  "created_at": "2026-06-24T14:40:00.000Z"
}
```

### Nodo Telegram en n8n
Configura el nodo de Telegram en n8n con estos valores:
* **Resource:** `Message`
* **Operation:** `Send`
* **Credentials:** El token de tu bot obtenido del BotFather.
* **Chat ID:** El ID numérico obtenido en el paso 2 (ej. `123456789`).
* **Text (Mensaje):** Puedes usar expresiones de n8n para formatear el mensaje. Ejemplo:

```text
🔔 *Nueva Cita Agendada en el Portal* 🔔

👤 *Cliente:* {{ $json.client_name }} ({{ $json.client_email }})
📅 *Fecha:* {{ $json.meeting_date }}
⏰ *Hora:* {{ $json.time_slot }}
📝 *Asunto:* {{ $json.topic }}

🔗 _Google Meet link generado en la invitación_
```

---

## 4. Endpoints del Portal que disparan alertas
El backend está preparado para conectarse con n8n en las siguientes acciones:

| Acción en el Portal | Endpoint Backend | Destino Recomendado en n8n |
|---|---|---|
| **Cita Agendada** | `POST /meetings/schedule` | Crear evento en Google Calendar + Alerta Telegram |
| **Documento Subido** | `POST /documents/upload` o `/{id}/upload` | Registrar en la base de datos + Alerta Telegram para aprobación |
| **Factura Pagada** | `POST /invoices/{id}/pay` | Cambiar estatus a pagado + Alerta Telegram de cobro |
| **Mantenimiento Renovado** | `POST /maintenance/{plan_id}/pay` | Extender suscripción + Alerta de renovación |

---

## 5. Probar la Integración localmente con n8n
Si estás corriendo n8n en tu máquina local (`localhost:5678`), puedes probarlo levantando n8n:
1. Corre `n8n start` en una terminal.
2. Crea un workflow con un nodo **Webhook** (método `POST`, ruta `/webhook/schedule-meeting`).
3. El backend del portal intentará conectarse a `http://localhost:5678/webhook/schedule-meeting` automáticamente al guardar una cita.
