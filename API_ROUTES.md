# API Routes Reference — ErtWeb Client Portal
> Base URL: `http://localhost:8000/api/v1`
> Autenticación: Bearer Token (JWT) en header `Authorization: Bearer <token>`

---

## 🔐 Auth

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/auth/login` | Público | Login. Body: `username=email&password=pass` (form-urlencoded) |
| GET | `/auth/me` | Token | Datos del usuario logueado |
| POST | `/auth/change-password` | Token | Cambia la contraseña propia. Body: `{current_password, new_password}`. Valida la actual; la nueva mínimo 6 caracteres. |

---

## 👥 Users (cuentas)

Roles: `admin` (todo), `seller` (WhatsApp, pipeline y agenda), `client` (su portal).

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/users?role=client` | Admin o n8n | Lista cuentas. Por defecto solo clientes; `role=seller`, `admin` o `all`. |
| GET | `/users/{id}` | Admin o n8n | Obtiene una cuenta |
| GET | `/users/{id}/overview` | Admin o n8n | Todo lo de un cliente en una llamada: `{user, projects, invoices, documents, maintenance_plans, manual_payments, appointments}` |
| POST | `/users` | Admin o n8n | Crea cuenta. Body: `{name, email, password, role?, phone?}`. Un admin elige el rol; con `X-N8N-API-Key` el rol siempre se fuerza a `client`. Password mínimo 6. |
| PUT | `/users/{id}` | Admin | Edita. Body: `{name?, email?, password?, phone?, role?, is_active?, avatar_url?}`. `is_active=false` bloquea el acceso sin borrar datos. |
| DELETE | `/users/{id}` | Admin | Elimina la cuenta y todo lo que cuelga de ella (proyectos, facturas, documentos, planes, citas). No permite borrarse a sí mismo ni dejar el portal sin admins. |

---

## 📁 Projects

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/projects/me` | Cliente | Proyectos del cliente logueado |
| GET | `/projects` | Admin | Todos los proyectos |
| GET | `/projects/client/{client_id}` | Admin | Proyectos de un cliente específico |
| POST | `/projects` | Admin | Crea proyecto. Body: `{client_id, name, description?, project_type?, status?, phase?, progress_pct?, estimated_weeks?, remaining_weeks?, updates_tags?}` |
| PUT | `/projects/{id}` | Admin o n8n | Actualiza proyecto (mismos campos, todos opcionales). Al cambiar de fase notifica al cliente. |
| DELETE | `/projects/{id}` | Admin | Elimina proyecto |

**Valores de `project_type`**: `website`, `automation`, `ecommerce`, `branding`, `other`
**Valores de `status`**: `active`, `completed`, `paused`, `cancelled`
**Valores de `phase`**: `Planificación`, `Diseño`, `Desarrollo`, `QA`, `Entregado`

---

## 🧾 Invoices (Facturas)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/invoices/me` | Cliente | Facturas del cliente logueado |
| GET | `/invoices` | Admin o n8n | Todas las facturas |
| GET | `/invoices/client/{client_id}` | Admin | Facturas de un cliente |
| POST | `/invoices` | Admin o n8n | Crea factura. Body: `{client_id, project_id?, number?, description?, amount, currency?, status?, due_date?}`. Sin `number` se genera el siguiente (`INV-2026-001`). Notifica al cliente. |
| PUT | `/invoices/{id}` | Admin | Actualiza factura. Body: `{status?, paid_at?, description?, amount?, due_date?}` |
| POST | `/invoices/{id}/upload-pdf` | Admin | Adjunta PDF (multipart/form-data: `file`) |
| POST | `/invoices/{id}/generate-pdf` | Admin o n8n | Genera el PDF del recibo desde la plantilla (`app/assets/plantilla_recibo.html`), lo guarda en `uploads/invoices/{number}.pdf` y lo asocia a la factura. Query params opcionales: `telefono`, `tipo_pago` (default `Anticipo 50%`). Devuelve `{"pdf_url": "<URL absoluta>"}`. |
| DELETE | `/invoices/{id}` | Admin | Elimina factura |

**Valores de `status`**: `pending`, `paid`, `overdue`, `cancelled`

---

## 📄 Documents (Documentos)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/documents/me` | Cliente | Documentos del cliente logueado |
| GET | `/documents` | Admin | Todos los documentos |
| GET | `/documents/client/{client_id}` | Admin | Documentos de un cliente |
| POST | `/documents/required` | Admin | Crea slot requerido. Body: `{client_id, project_id?, name, doc_type?}` |
| POST | `/documents/upload` | Cliente | Sube documento (multipart: `file, name, project_id?, doc_type?`) |
| PUT | `/documents/{id}/status` | Admin | Cambia estado. Body: `{status, admin_notes?}` |
| DELETE | `/documents/{id}` | Cliente/Admin | Elimina documento y archivo del disco |

**Valores de `status`**: `pending`, `review`, `approved`, `rejected`
**Tipos de archivo permitidos**: `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.doc`, `.docx`, `.xlsx`
**Tamaño máximo**: 10 MB

---

## 🔧 Maintenance (Mantenimiento)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/maintenance/me` | Cliente | Planes del cliente logueado |
| GET | `/maintenance/me/payments` | Cliente | Historial de pagos del cliente |
| GET | `/maintenance` | Admin | Todos los planes |
| GET | `/maintenance/client/{client_id}` | Admin | Planes de un cliente específico |
| POST | `/maintenance` | Admin o n8n | Crea plan. Body: `{client_id, plan_name, description?, price, currency?, billing_cycle?, start_date?, next_payment_date?, tasks_json?}`. Acepta `X-N8N-API-Key` además del JWT de admin. |
| PUT | `/maintenance/{id}` | Admin | Actualiza plan |
| DELETE | `/maintenance/{id}` | Admin | Elimina plan |
| GET | `/maintenance/{plan_id}/payments` | Admin o n8n | Historial de pagos del plan |
| POST | `/maintenance/{plan_id}/payments` | Admin | Agrega registro de pago. Body: `{plan_id, amount, currency?, due_date?, notes?}` |
| PUT | `/maintenance/payments/{payment_id}/mark-paid` | Admin | Marca pago como pagado |

**`tasks_json`**: JSON string con array de strings: `'["Software Update", "Security Audit"]'`
**Valores de `billing_cycle`**: `monthly`, `annual`

---

## 📜 Terms (Términos y Condiciones)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/terms/generate-pdf` | Admin o n8n | Genera el PDF de Términos y Condiciones desde `app/assets/plantilla_terminos.html`. Body: `{cliente_nombre, proyecto_nombre, client_id?}`. Se guarda en `uploads/documents/terminos_{slug}_{fecha}.pdf`. Si viene `client_id`, queda registrado como documento del cliente (doc_type `terminos`, status `approved`) visible en su portal. Devuelve `{"pdf_url": "<URL absoluta>"}`. |

Las URLs absolutas se construyen con `BACKEND_BASE_URL` del `.env` — en producción debe ser `https://api.ertweb.com`.

---

## 🔔 Notifications

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/notifications` | Token | Notificaciones del usuario logueado |
| GET | `/notifications/unread-count` | Token | `{unread: n}` |
| POST | `/notifications/read-all` | Token | Marca todas como leídas |
| POST | `/notifications/send` | Admin o n8n | Envía notificación. Body: `{user_id, title, message, type, subtitle?, action_text?}` |

**Valores de `type`**: `milestone`, `document`, `support`, `update`

---

## 📅 Appointments (Citas)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/appointments/me` | Cliente | Citas del cliente logueado |
| GET | `/appointments` | Admin, vendedor o n8n | Todas las citas (clientes y leads) |
| GET | `/appointments/client/{client_id}` | Admin, vendedor o n8n | Citas de un cliente |
| POST | `/appointments` | Admin, vendedor o n8n | Crea una cita. Body: `{title, appointment_date, time_slot, duration_minutes?, meeting_link?, notes?}` más `client_id` (cliente del portal) **o** `contact_name` / `contact_phone` (lead sin cuenta). |
| PUT | `/appointments/{id}` | Admin, vendedor o n8n | Actualiza. Body: `{title?, description?, appointment_date?, time_slot?, duration_minutes?, status?, meeting_link?, notes?}` |
| DELETE | `/appointments/{id}` | Admin / vendedor | El admin borra cualquiera; el vendedor solo las que creó |
| POST | `/meetings/schedule` | Cliente | El cliente agenda desde su portal. Body: `{meeting_date, time_slot, topic}`. Dispara `/webhook/schedule-meeting` en n8n; si responde `meeting_link` queda guardado. 409 si el horario ya está reservado. |
| GET | `/meetings/taken-slots?meeting_date=YYYY-MM-DD` | Token | Horarios ya reservados de ese día |

**Valores de `status`**: `scheduled`, `completed`, `cancelled`, `no_show`
**Valores de `source`**: `client`, `admin`, `seller`, `n8n`

---

## 💬 WhatsApp (vendedor + n8n)

Guía completa de la conexión con n8n: **`N8N_WHATSAPP.md`**.

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| POST | `/whatsapp/n8n/messages` | n8n | Registra un mensaje entrante o la respuesta de la IA. Devuelve `ai_enabled`. |
| GET | `/whatsapp/n8n/ai-status?phone=` | n8n | ¿La IA puede responder a ese número? |
| PUT | `/whatsapp/n8n/ai-status` | n8n | n8n pausa/activa la IA de un número: `{phone, ai_enabled}` (comando del jefe, fusible) |
| GET / PUT | `/whatsapp/settings` | Admin / vendedor | Interruptor general de la IA: `{ai_enabled}` |
| GET | `/whatsapp/conversations?search=&stage=` | Admin / vendedor | Bandeja de chats |
| POST | `/whatsapp/conversations` | Admin / vendedor | Abre un chat con un número nuevo: `{phone, contact_name?}` |
| GET | `/whatsapp/conversations/{id}/messages` | Admin / vendedor | Mensajes (marca el chat como leído) |
| PATCH | `/whatsapp/conversations/{id}` | Admin / vendedor | `{ai_enabled?, stage?, contact_name?, notes?, assigned_to?}` |
| POST | `/whatsapp/conversations/{id}/send` | Admin / vendedor | Responde: `{text}`. Lo envía n8n; 502 si n8n falla. |
| POST | `/whatsapp/conversations/{id}/appointment` | Admin / vendedor | Agenda una cita con el contacto y dispara el workflow de agendamiento |
| POST | `/whatsapp/conversations/{id}/convert` | Admin / vendedor | Venta cerrada: crea la cuenta `client` del contacto. Body: `{name, email, password}` |

**Etapas (`stage`)**: `new`, `contacted`, `negotiation`, `proposal`, `won`, `lost`

---

## 💳 Manual Payments (Binance / transferencias)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/manual-payments/me` | Cliente | Mis pagos manuales enviados |
| GET | `/manual-payments` | Admin | Todos los pagos manuales pendientes de revisión |
| GET | `/manual-payments/client/{client_id}` | Admin | Pagos manuales de un cliente específico |
| GET | `/manual-payments/pending` | Admin o n8n | Pagos pendientes de revisión |
| POST | `/manual-payments/n8n` | n8n | Registra un comprobante que llegó por WhatsApp. Body JSON: `{client_id, amount, currency?, payment_method?, transaction_ref?, notes?, invoice_id?, plan_id?}`. Sin `invoice_id` se asocia a la factura pendiente más antigua. |
| POST | `/manual-payments` | Cliente | Envía comprobante (multipart: `amount, currency?, payment_method?, transaction_ref?, invoice_id?, plan_id?, file?`). La factura o plan debe ser suyo; solo un comprobante en revisión a la vez. |
| PUT | `/manual-payments/{id}/status` | Admin o n8n | Aprueba/rechaza. Body: `{status: "approved"|"rejected", admin_notes?}`. Al aprobar marca automáticamente la factura o plan asociado como pagado. |

---

## 📦 Archivos estáticos

Los archivos subidos se sirven desde:
- Documentos: `GET /uploads/documents/{filename}`
- Facturas PDF: `GET /uploads/invoices/{filename}`

---

## 🔑 Obtener token para n8n

La contraseña de admin ya NO es fija en el código — se define en `backend/.env` (`ADMIN_DEFAULT_PASSWORD`). Ver credenciales actuales con el usuario del proyecto.

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=gleybertmartinez0702@gmail.com&password=<ADMIN_DEFAULT_PASSWORD del .env>" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

Respuesta: `{"access_token": "eyJ...", "token_type": "bearer"}`

Usar en headers: `Authorization: Bearer eyJ...`

⚠️ El token expira en 7 días (`ACCESS_TOKEN_EXPIRE_MINUTES`). Para un workflow de n8n de larga duración, agrega un nodo al inicio del flujo que haga login y guarde el token en una variable, y repite el login si una request devuelve 401. Casi todos los endpoints que usa n8n aceptan `X-N8N-API-Key`, que no expira: úsala siempre que puedas.

---

## 📝 Ejemplo n8n — Registrar cliente tras aprobar el pago

No hace falta token JWT: basta con la clave `N8N_API_KEY` del `.env` en el header `X-N8N-API-Key` (igual que en pagos manuales).

```json
POST /api/v1/users/
X-N8N-API-Key: {{N8N_API_KEY}}
Content-Type: application/json

{
  "email": "{{cliente_email}}",
  "name": "{{cliente_nombre}}",
  "password": "{{password_temporal_generada}}"
}
```

El rol siempre queda como `client` (no se pueden crear admins por esta vía).

Devuelve el `id` del cliente creado — guárdalo para los siguientes pasos del flujo (crear proyecto, factura, notificación de bienvenida, etc.)

## 📝 Ejemplo n8n — Consultar toda la info de un cliente (para responder preguntas)

Una sola llamada: `GET /api/v1/users/{client_id}/overview` (acepta `X-N8N-API-Key`). O recurso por recurso:

```
GET /api/v1/users/{client_id}
GET /api/v1/projects/client/{client_id}
GET /api/v1/invoices/client/{client_id}
GET /api/v1/documents/client/{client_id}
GET /api/v1/maintenance/client/{client_id}
GET /api/v1/manual-payments/client/{client_id}
```

Todas aceptan `X-N8N-API-Key` o `Authorization: Bearer {{token}}` de un admin.

## 📝 Ejemplo n8n — Actualizar progreso de proyecto

```json
PUT /api/v1/projects/{project_id}
X-N8N-API-Key: {{N8N_API_KEY}}
Content-Type: application/json

{
  "progress_pct": 75,
  "phase": "Desarrollo",
  "updates_tags": "Diseño listo,Backend en progreso"
}
```

## 📝 Ejemplo n8n — Enviar notificación a cliente

```json
POST /api/v1/notifications/send
X-N8N-API-Key: {{N8N_API_KEY}}
Content-Type: application/json

{
  "user_id": "{{client_id}}",
  "title": "Actualización de tu proyecto",
  "message": "Tu proyecto ha avanzado al 75%. Entramos en la fase de Desarrollo.",
  "type": "milestone"
}
```
