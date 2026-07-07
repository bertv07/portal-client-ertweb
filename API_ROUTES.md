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

## 👥 Users (solo admin)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/users` | Admin | Lista todos los clientes |
| GET | `/users/{id}` | Admin | Obtiene un cliente |
| POST | `/users` | Admin o n8n | Crea cliente. Body: `{name, email, password}`. Acepta `X-N8N-API-Key` además del JWT de admin. El rol siempre se fuerza a `client`. |
| PUT | `/users/{id}` | Admin | Actualiza cliente. Body: `{name?, email?, password?, avatar_url?}` |
| DELETE | `/users/{id}` | Admin | Elimina cliente |

---

## 📁 Projects

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/projects/me` | Cliente | Proyectos del cliente logueado |
| GET | `/projects` | Admin | Todos los proyectos |
| GET | `/projects/client/{client_id}` | Admin | Proyectos de un cliente específico |
| POST | `/projects` | Admin | Crea proyecto. Body: `{client_id, name, description?, project_type?, status?, phase?, progress_pct?, estimated_weeks?, remaining_weeks?, updates_tags?}` |
| PUT | `/projects/{id}` | Admin | Actualiza proyecto (mismos campos, todos opcionales) |
| DELETE | `/projects/{id}` | Admin | Elimina proyecto |

**Valores de `project_type`**: `website`, `automation`, `ecommerce`, `branding`, `other`
**Valores de `status`**: `active`, `completed`, `paused`, `cancelled`
**Valores de `phase`**: `Planificación`, `Diseño`, `Desarrollo`, `QA`, `Entregado`

---

## 🧾 Invoices (Facturas)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/invoices/me` | Cliente | Facturas del cliente logueado |
| GET | `/invoices` | Admin | Todas las facturas |
| GET | `/invoices/client/{client_id}` | Admin | Facturas de un cliente |
| POST | `/invoices` | Admin | Crea factura. Body: `{client_id, project_id?, number, description?, amount, currency?, status?, due_date?}` |
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
| GET | `/notifications` | Cliente | Notificaciones del cliente logueado |
| POST | `/notifications/send` | Admin | Envía notificación. Body: `{user_id, title, message, type, subtitle?, action_text?}` |

**Valores de `type`**: `milestone`, `document`, `support`, `update`

---

## 📅 Appointments (Citas)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/appointments/me` | Cliente | Citas del cliente logueado |
| GET | `/appointments` | Admin | Todas las citas |
| GET | `/appointments/client/{client_id}` | Admin | Citas de un cliente específico |
| POST | `/appointments` | Admin o n8n | Crea una cita. Acepta `X-N8N-API-Key` además del JWT de admin. |
| PUT | `/appointments/{id}` | Admin | Actualiza una cita. Body: `{title?, description?, appointment_date?, time_slot?, duration_minutes?, status?, meeting_link?, notes?}` |
| DELETE | `/appointments/{id}` | Admin | Elimina una cita |

**Valores de `status`**: `scheduled`, `completed`, `cancelled`, `no_show`
**Valores de `source`**: `client`, `admin`, `n8n`

---

## 💳 Manual Payments (Binance / transferencias)

| Method | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/manual-payments/me` | Cliente | Mis pagos manuales enviados |
| GET | `/manual-payments` | Admin | Todos los pagos manuales pendientes de revisión |
| GET | `/manual-payments/client/{client_id}` | Admin | Pagos manuales de un cliente específico |
| POST | `/manual-payments` | Cliente | Envía comprobante (multipart: `amount, currency?, payment_method?, transaction_ref?, invoice_id?, plan_id?, file?`) |
| PUT | `/manual-payments/{id}/status` | Admin | Aprueba/rechaza. Body: `{status: "approved"|"rejected", admin_notes?}`. Al aprobar marca automáticamente la factura o plan asociado como pagado. |

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

⚠️ El token expira en 7 días (`ACCESS_TOKEN_EXPIRE_MINUTES`). Para un workflow de n8n de larga duración, agrega un nodo al inicio del flujo que haga login y guarde el token en una variable, y repite el login si una request devuelve 403.

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

Con el `client_id`, hace falta hacer una request a cada recurso (no hay un único endpoint "todo en uno"):

```
GET /api/v1/users/{client_id}
GET /api/v1/projects/client/{client_id}
GET /api/v1/invoices/client/{client_id}
GET /api/v1/documents/client/{client_id}
GET /api/v1/maintenance/client/{client_id}
GET /api/v1/manual-payments/client/{client_id}
```

Todas requieren `Authorization: Bearer {{token}}` de un admin.

## 📝 Ejemplo n8n — Actualizar progreso de proyecto

```json
POST /api/v1/projects/{project_id}
Authorization: Bearer {{token}}
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
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "user_id": "{{client_id}}",
  "title": "Actualización de tu proyecto",
  "message": "Tu proyecto ha avanzado al 75%. Entramos en la fase de Desarrollo.",
  "type": "milestone"
}
```
