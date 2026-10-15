# Encargo: app móvil del Portal ErtWeb en React Native

Vas a construir la app móvil (iOS y Android) del **Portal ErtWeb**, que hoy existe como web. La app **no tiene backend propio**: consume la misma API REST que la web, con las mismas cuentas y los mismos datos. Todo lo que se haga en la app debe verse en la web al instante y al revés.

Te adjunto el repositorio de la web como referencia (`frontend/src` es la fuente de verdad de pantallas, textos y reglas; `API_ROUTES.md` lista todas las rutas). **No modifiques el backend ni la web.** Si algo que pido no se puede hacer con la API actual, no lo inventes: constrúyelo hasta donde se pueda y anótalo en la lista final de pendientes.

## 1. Stack obligatorio

- **Expo (SDK estable actual) + React Native + TypeScript**, con **Expo Router** (rutas por archivos).
- **TanStack Query** para datos del servidor (mismas claves y tiempos de refresco que la web).
- **axios** con interceptores (token y manejo de 401).
- **expo-secure-store** para el token. Nunca AsyncStorage para credenciales.
- **react-native-reanimated** + **react-native-gesture-handler** para animaciones y gestos.
- **expo-document-picker** y **expo-image-picker** para subir archivos; **expo-web-browser** para abrir PDFs, links de reunión y el pago con PayPal.
- **expo-font** con **Montserrat** (400, 500, 600, 700, 800). Íconos: **lucide-react-native** (los mismos de la web).
- Idioma de la interfaz: **español**. Fechas y montos con formato `es-VE`.

## 2. Conexión con el backend

- Base de la API: variable `EXPO_PUBLIC_API_URL`, por defecto `https://api.ertweb.com/api/v1`.
- Origen de archivos: `EXPO_PUBLIC_FILES_URL`, por defecto `https://api.ertweb.com`. La API devuelve rutas relativas como `/uploads/invoices/INV-2026-001.pdf`: antepón este origen. Si la ruta ya empieza por `http`, úsala tal cual.
- Las rutas de colección llevan **slash final** (`/users/`, `/invoices/`, `/appointments/`, `/notifications/`, `/manual-payments/`, `/projects/`, `/documents/`, `/maintenance/`).
- Autenticación: header `Authorization: Bearer <token>` en todo menos el login.
- **Errores**: el cuerpo es `{ "detail": "texto" }` o `{ "detail": [{ "msg": "texto" }] }`. Muestra ese texto al usuario. Si no hay respuesta: "No se pudo conectar con el servidor."
- **401 en cualquier llamada que no sea el login** = sesión vencida o cuenta desactivada: borra el token, limpia la caché de TanStack Query y manda al login.
- Al iniciar y al cerrar sesión, **limpia toda la caché** (para que un usuario nunca vea datos del anterior).

### Login

```
POST /auth/login          Content-Type: application/x-www-form-urlencoded
body: username=<correo>&password=<clave>
200 → { "access_token": "...", "token_type": "bearer" }
400 → correo o contraseña incorrectos
403 → cuenta desactivada
```

Después llama `GET /auth/me` → `User`. El token dura 7 días y **no hay refresh token**: al vencer, el usuario vuelve a iniciar sesión.
Cambiar contraseña: `POST /auth/change-password` `{ current_password, new_password }` (mínimo 6 caracteres).
No existe registro ni "olvidé mi contraseña": en el login muestra "¿No recuerdas tu contraseña? Escríbenos y te generamos una nueva."

### Tipos

```ts
type Role = 'admin' | 'seller' | 'client';
type User = { id: string; email: string; name: string; role: Role; phone: string | null; avatar_url: string | null; is_active: boolean; created_at: string };

type Project = { id: string; client_id: string; name: string; description: string | null;
  project_type: 'website' | 'automation' | 'ecommerce' | 'branding' | 'other';
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  phase: string;            // normalmente: Planificación | Diseño | Desarrollo | QA | Entregado
  progress_pct: number;     // 0–100
  estimated_weeks: number | null; remaining_weeks: number | null;
  updates_tags: string | null;   // etiquetas separadas por coma
  started_at: string | null; due_at: string | null; completed_at: string | null; created_at: string };

type Invoice = { id: string; client_id: string; project_id: string | null; number: string; description: string | null;
  amount: number; currency: string; status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;  // YYYY-MM-DD
  paid_at: string | null; pdf_url: string | null; created_at: string };

type Doc = { id: string; client_id: string; project_id: string | null; name: string; original_filename: string;
  file_url: string;         // '' si aún no se subió
  file_type: string; file_size_bytes: number | null; doc_type: string;
  source: 'required' | 'uploaded'; status: 'pending' | 'review' | 'approved' | 'rejected';
  admin_notes: string | null; created_at: string; updated_at: string };

type MaintenancePlan = { id: string; client_id: string; plan_name: string; description: string | null; price: number; currency: string;
  billing_cycle: 'monthly' | 'annual'; start_date: string | null; next_payment_date: string | null; is_active: boolean;
  tasks_json: string | null;  // JSON con un arreglo de strings; parsear con try/catch
  created_at: string };
type MaintenancePayment = { id: string; plan_id: string; amount: number; currency: string; status: 'pending' | 'paid' | 'overdue';
  due_date: string | null; paid_at: string | null; notes: string | null; created_at: string };

type ManualPayment = { id: string; client_id: string; payment_method: string; amount: number; currency: string;
  transaction_ref: string | null; invoice_id: string | null; plan_id: string | null; proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected'; admin_notes: string | null; reviewed_at: string | null; created_at: string };

type Notification = { id: string; title: string; subtitle: string | null; message: string;
  type: 'milestone' | 'document' | 'support' | 'update'; is_read: boolean; created_at: string };

type Appointment = { id: string; client_id: string | null; client_name: string | null; client_email: string | null;
  contact_name: string | null; contact_phone: string | null; conversation_id: string | null;
  title: string; description: string | null;
  appointment_date: string;   // YYYY-MM-DD — interpretar como fecha LOCAL, nunca con new Date('YYYY-MM-DD')
  time_slot: string;          // '10:00 AM', hora de Venezuela
  duration_minutes: number; meeting_link: string | null; notes: string | null;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'no_show';   // pending = por confirmar
  source: 'client' | 'admin' | 'seller' | 'n8n'; created_at: string };

type Stage = 'new' | 'contacted' | 'negotiation' | 'proposal' | 'won' | 'lost';
type Conversation = { id: string; phone: string; contact_name: string | null; ai_enabled: boolean; stage: Stage; notes: string | null;
  assigned_to: string | null; client_id: string | null; last_message_text: string | null; last_message_at: string | null;
  unread_count: number; created_at: string };
type Message = { id: string; conversation_id: string; direction: 'in' | 'out'; sender: 'contact' | 'ai' | 'agent';
  text: string; media_url: string | null; media_type: string | null; status: 'received' | 'sent' | 'failed'; created_at: string };
```

## 3. Navegación por rol

Después del login, `user.role` decide la app completa. Un rol nunca ve pantallas de otro.

| Rol | Pestañas inferiores |
|---|---|
| `client` | Inicio · Documentos · Pagos · Agenda · Más (Mantenimiento, Notificaciones, Cambiar contraseña, Cerrar sesión) |
| `seller` | Inicio · WhatsApp · Pipeline · Agenda · Cuenta |
| `admin` | Inicio · WhatsApp · Agenda · Pagos · Más (Cuentas, Proyectos, Facturación, Documentos, Mantenimiento, Avisos, Pipeline) |

Máximo 5 pestañas. Insignias numéricas: chats sin leer en WhatsApp, pagos por revisar en Pagos (admin), notificaciones sin leer (cliente), reuniones por confirmar en Agenda (admin y vendedor).

**Orden de construcción y prioridad:** 1) base + login, 2) cliente completo, 3) vendedor completo, 4) admin. Entrega cada fase funcionando antes de empezar la siguiente.

## 4. Pantallas del CLIENTE

**Inicio** — `GET /projects/me`, `/documents/me`, `/invoices/me`, `/appointments/me`
- Saludo ("Buenos días / tardes / noches, {nombre}") y fecha.
- Si tiene varios proyectos, selector deslizable.
- Tarjeta del proyecto: tipo, nombre, estado, descripción, **porcentaje grande**, semanas restantes (no las muestres si `progress_pct >= 100` o `status = completed`).
- **Recorrido por fases**: 5 columnas de altura creciente (Planificación, Diseño, Desarrollo, QA, Entregado). Fases pasadas con check, la actual en morado sólido con la etiqueta "Ahora", las futuras con trama rayada. La fase actual se obtiene comparando `phase` con el inicio de cada nombre, sin distinguir mayúsculas (ej. "QA & Pruebas" es QA). Si no coincide con ninguna, muestra solo el texto "Fase actual: …".
- "Últimas novedades": `updates_tags` separadas por coma, como etiquetas.
- "Necesitamos de ti": documentos en `pending` o `rejected` (botón Subir) y facturas `pending`/`overdue` (llevan a Pagos). Si no hay nada: "Todo al día".
- "Próxima reunión": la más cercana con estado `pending` o `scheduled`; si es `pending` muestra "Por confirmar"; si tiene `meeting_link`, botón Unirse.

**Documentos** — `GET /documents/me`
- "Te pedimos estos documentos": los `pending`, y los `rejected` con `source = required` (muestra el motivo `admin_notes`). Subir a ese espacio: `POST /documents/{id}/upload` multipart, campo `file`.
- "Tus documentos": el resto, con estado, fecha, abrir archivo. Eliminar (`DELETE /documents/{id}`) solo si no está `approved`.
- "Enviar un archivo": `POST /documents/upload` multipart con `file`, `name`, `doc_type=general`.
- Tipos permitidos: pdf, jpg, jpeg, png, webp, doc, docx, xlsx. Máximo 10 MB: valida antes de subir.

**Pagos** — `GET /invoices/me`, `GET /manual-payments/me`
- Saldo pendiente (suma de `pending` + `overdue`) y total pagado.
- Lista de facturas con estado, vencimiento y botón de descargar recibo si hay `pdf_url`.
- Una factura con un pago manual `pending` asociado se muestra como **"Pago en verificación"** y **no** ofrece pagar. Si su último pago manual fue `rejected`, muestra el motivo.
- **Pagar** abre una hoja con dos métodos:
  - **Binance Pay**: `GET /payments/binance-info` → `{ binance_id, binance_email, binance_name }` (si vienen vacíos, di que no está disponible). Muestra los datos con botón de copiar, pide el ID de transacción y una captura opcional, y envía `POST /manual-payments/` multipart: `amount`, `currency`, `payment_method=binance`, `transaction_ref`, `invoice_id` (o `plan_id`), `file` opcional. Al terminar: "Recibimos tu comprobante. Lo verificamos y te avisamos."
  - **PayPal o tarjeta**: la API de PayPal del backend está hecha para el SDK web y no devuelve una URL de aprobación, así que **no la integres nativa**. Abre `https://portal.ertweb.com/billing` con `expo-web-browser` y, al volver a la app, refresca las facturas.

**Agenda** — `GET /appointments/me`
- Formulario "Solicita una reunión": asunto, fecha (no anterior a hoy), hora. Horas: `09:00 AM, 09:30 AM, 10:00 AM, 11:00 AM, 01:30 PM, 02:00 PM, 03:30 PM, 04:00 PM`.
- Al elegir fecha: `GET /meetings/taken-slots?meeting_date=YYYY-MM-DD` → `{ taken: string[] }`; esas horas van deshabilitadas.
- Enviar: `POST /meetings/schedule` `{ meeting_date, time_slot, topic }`. Respuesta `{ status: "pending", appointment_id, ... }`. **La reunión NO queda confirmada**: muestra "Solicitud enviada. Tu reunión queda por confirmar; te avisamos apenas el equipo la confirme." Un 409 significa que ese horario ya se ocupó.
- Lista "Tus reuniones" con su estado (Por confirmar, Confirmada, Completada, Cancelada, No asistió) y botón Unirse si está confirmada y tiene link.

**Mantenimiento** — `GET /maintenance/me`, `GET /maintenance/me/payments`
- Por plan: nombre, estado, tareas incluidas, días para el próximo pago (o "Vencido"), precio y ciclo, botón "Renovar / pagar" (misma hoja de pago, con `plan_id`). Si hay un pago manual `pending` de ese plan: "Pago en verificación".
- Historial de pagos.

**Notificaciones** — `GET /notifications/`
- Lista con ícono según `type`, título, mensaje y tiempo relativo ("hace 5 min", "ayer"). Las no leídas resaltadas.
- Al abrir la pantalla: `POST /notifications/read-all`. Insignia: `GET /notifications/unread-count` → `{ unread }`, cada 60 s y al volver a primer plano.

## 5. Pantallas del VENDEDOR

**Inicio** — `GET /whatsapp/conversations`, `GET /appointments/`, `GET /whatsapp/settings`
- Cifras: chats sin leer, leads activos (los que no están en `won` ni `lost`), citas próximas, ventas cerradas.
- Barras de leads nuevos de los últimos 7 días (por `created_at`).
- Leads por etapa, chats que esperan respuesta (toque → abre el chat), próximas citas.

**WhatsApp (bandeja)** — `GET /whatsapp/conversations?search=`
- Interruptor general "Asistente de IA": `GET` / `PUT /whatsapp/settings` `{ ai_enabled }`.
- Lista de chats: nombre o teléfono, último mensaje, hora relativa, sin leer, etapa, ícono si la IA está pausada. Filtros: Todos · Sin leer · IA pausada. Búsqueda. Refresco cada 6 s **solo con la pantalla visible y la app en primer plano**, y deslizar para refrescar.
- Botón "Nuevo chat": `POST /whatsapp/conversations` `{ phone, contact_name? }`.

**Chat** — `GET /whatsapp/conversations/{id}/messages` (cada 4 s en primer plano; esta llamada marca el chat como leído)
- Burbujas: entrantes a la izquierda (blanco); salientes de la IA a la derecha en morado claro con la etiqueta "IA"; salientes del equipo en morado sólido. Adjuntos (`media_url`) como enlace.
- Enviar: `POST /whatsapp/conversations/{id}/send` `{ text }`. Si responde **502**, el mensaje quedó guardado como `failed`: muéstralo en rojo con "No enviado · Reintentar" y el motivo que trae `detail`.
- Si la IA está activa en ese chat, aviso sobre el campo de texto: "La IA sigue activa en este chat. Si vas a atenderlo tú, pausa la IA."
- Panel de detalles (hoja inferior): interruptor "IA en este chat", etapa, nombre, notas internas → `PATCH /whatsapp/conversations/{id}` con `{ ai_enabled?, stage?, contact_name?, notes? }`.
- "Agendar cita": `POST /whatsapp/conversations/{id}/appointment` `{ title, appointment_date, time_slot, duration_minutes, notes? }` → `{ appointment, n8n_status: "success" | "offline", n8n_error }`. Si es `offline`, avisa: "Quedó guardada en el portal, pero no se creó en el calendario."
- "Crear cuenta de cliente" (solo si `client_id` es null): `POST /whatsapp/conversations/{id}/convert` `{ name, email, password }`. Muestra las credenciales con botón de compartir.

**Pipeline**
- Tablero horizontal con una columna por etapa: Nuevo, Contactado, Negociación, Propuesta enviada, Venta cerrada, Perdido. Cada tarjeta: nombre, teléfono, nota o último mensaje, IA activa/pausada.
- Mover un lead: mantener presionado y arrastrar a otra columna, **y además** un menú "Mover a…" en la tarjeta (accesible sin gestos). `PATCH …/{id}` `{ stage }` con actualización optimista y reversión si falla.

**Agenda** — `GET /appointments/`
- Pestañas: **Por confirmar** (estado `pending`; es la pestaña inicial si hay alguna) · Próximas · Historial.
- En "Por confirmar": botones **Confirmar** (`PUT /appointments/{id}` `{ status: "scheduled" }`) y **Rechazar** (`{ status: "cancelled" }`, con confirmación). Confirmar avisa al cliente y crea el evento en el calendario; lo hace el backend.
- Cada cita muestra con quién es: `client_name` o, si no hay, `contact_name`.
- Crear cita: `POST /appointments/` con `contact_name` + `contact_phone` (lead). Editar: `PUT`. Eliminar: `DELETE` (el vendedor solo puede borrar las que creó: un 403 se muestra como mensaje, no como fallo).

## 6. Pantallas del ADMIN

Todo lo del vendedor, más:

- **Inicio**: clientes, proyectos activos, por cobrar, cobrado este mes; ingresos cobrados de los últimos 6 meses (facturas `paid` por `paid_at`); "Pendientes de acción" (reuniones por confirmar, comprobantes por revisar, documentos en revisión, chats sin leer, facturas por cobrar), cada uno lleva a su pantalla.
- **Pagos**: `GET /manual-payments/`. Filtros Por revisar · Aprobados · Rechazados · Todos. Ver comprobante (`proof_url`), **Aprobar** / **Rechazar** con `PUT /manual-payments/{id}/status` `{ status: "approved" | "rejected", admin_notes? }` (el motivo es obligatorio al rechazar).
- **Cuentas**: `GET /users/?role=all`. Pestañas Clientes · Vendedores · Administradores. Crear (`POST /users/` `{ name, email, password, role, phone? }`, con generador de contraseña y pantalla final para compartir el acceso), editar (`PUT /users/{id}` `{ name?, email?, phone?, role?, password?, is_active? }`), eliminar (`DELETE`, con advertencia fuerte: borra todos sus datos). "Ver portal del cliente": `GET /users/{id}/overview` → `{ user, projects, invoices, documents, maintenance_plans, manual_payments, appointments }`.
- **Proyectos**: `GET/POST /projects/`, `PUT/DELETE /projects/{id}`. Editar fase, progreso (deslizador de 0 a 100), estado, semanas y novedades.
- **Facturación**: `GET/POST /invoices/` (`number` es opcional: si no se envía se genera), marcar pagada (`PUT /invoices/{id}` `{ status: "paid" }`), generar recibo (`POST /invoices/{id}/generate-pdf` → `{ pdf_url }`), eliminar.
- **Documentos**: `GET /documents/`; solicitar (`POST /documents/required` `{ client_id, project_id?, name, doc_type }`); aprobar o rechazar (`PUT /documents/{id}/status` `{ status: "approved" | "rejected", admin_notes? }`).
- **Mantenimiento**: `GET/POST /maintenance/`, activar/desactivar (`PUT /maintenance/{id}` `{ is_active }`), eliminar.
- **Avisos**: `POST /notifications/send` `{ user_id, title, message, type }` a un cliente o a todos (una llamada por cliente).
- En la Agenda del admin, al crear una cita puede elegir un cliente del portal (`client_id`, lista de `GET /users/`) o un lead.

## 7. Diseño

La app debe verse como hermana de la web, no como una plantilla. Mismos tokens:

```
Morado de marca:  50 #f6f2f9 · 100 #ece2f1 · 200 #d9c5e3 · 300 #bb96cc · 400 #9563ac · 500 #7b3f96
                  600 #57286d (primario) · 700 #451f57 · 800 #341742 · 900 #241030 · 950 #150a1c
Neutros teñidos:  50 #faf9fb · 100 #f3f1f5 · 200 #e6e2ea · 300 #d1cbd8 · 400 #a39cac · 500 #6c6476
                  600 #544d5d · 700 #3f3947 · 800 #29242f · 900 #19151e
Fondo de pantalla #f6f2f9 · Tarjetas #ffffff con borde #ece2f1 · Texto #19151e · Texto secundario #6c6476 (mínimo para texto)
Estados: éxito esmeralda · atención ámbar · error rojo · información celeste (fondo claro + texto oscuro del mismo tono)
Radios: tarjetas 16 · controles 12 · chips y avatares totalmente redondos
Tipografía Montserrat: título de pantalla 24/800 · título de tarjeta 15/700 · cuerpo 14–15/500 · secundario 13 · mínimo 12
Cifras con números tabulares. Espaciado en múltiplos de 4; 16 de margen lateral; 20–24 dentro de tarjetas.
```

Reglas:
- Modo claro únicamente en esta versión.
- Todo lo tocable mide al menos **44×44 pt**, con 8 pt de separación.
- Estados completos en cada pantalla: carga (esqueletos con la forma del contenido, no un spinner al centro), vacío (un texto que explique qué aparecerá ahí), error (con botón Reintentar) y sin conexión.
- Respeta las áreas seguras y el teclado (los formularios no deben quedar tapados).
- Accesibilidad: `accessibilityLabel` en todo botón de solo ícono, contraste AA, soporta tamaño de texto del sistema sin romper el layout.
- Prohibido: degradados decorativos, vidrio/blur decorativo, texto con degradado, emojis como íconos, filas de tarjetas idénticas con ícono + número + etiqueta. Las cifras de resumen van en **una franja con divisores**, como en la web.
- Usa los patrones nativos de cada plataforma: hojas inferiores para acciones y formularios cortos, deslizar para refrescar, gesto de volver, alertas nativas para confirmar acciones destructivas.

Movimiento (Reanimated, resortes; nada de curvas con rebote exagerado):
- Botones: escala a 0.96 al presionar y vuelven con resorte (`stiffness 520, damping 32`). Vibración háptica ligera en acciones principales (confirmar, aprobar, enviar).
- Interruptores e indicadores de pestañas se deslizan con resorte (`stiffness 380, damping 34`).
- Hojas y modales entran con resorte (`stiffness 420, damping 36`) y salen más rápido de lo que entran.
- Mensajes nuevos del chat entran desde su lado; el historial al abrir aparece quieto.
- En el pipeline la tarjeta viaja a su nueva columna.
- Sin coreografías de entrada por pantalla. Respeta "Reducir movimiento" del sistema: conserva cambios de opacidad y color, quita desplazamientos.

## 8. Cosas que la API todavía NO tiene (no las inventes)

Construye la app sin ellas y déjalas en tu lista de pendientes con lo que necesitarías del backend:

1. **Notificaciones push**: no hay endpoint para registrar el token del dispositivo. En esta versión las insignias se actualizan por consulta periódica y al volver a primer plano.
2. **Tiempo real**: no hay WebSocket. El chat y la bandeja usan consulta periódica, solo en primer plano.
3. **Refresh token** y **recuperación de contraseña**: no existen.
4. **PayPal nativo**: el backend no devuelve URL de aprobación (ver Pagos).
5. **Paginación**: los listados devuelven todo; usa listas virtualizadas (`FlashList` o `FlatList`).
6. **Subir archivos como admin** a nombre de un cliente: no existe.

## 9. Qué debes entregar

1. Proyecto Expo completo, que arranque con `npx expo start`, con `.env.example`.
2. Estructura clara: `app/` (rutas por rol), `src/api/` (cliente axios + funciones por recurso + tipos), `src/components/ui/` (Button, Card, Badge, Field, Sheet, Segmented, StatStrip, Skeleton, EmptyState), `src/theme/` (tokens), `src/lib/` (formato de fechas y montos).
3. README con: cómo correrla contra un backend local (URL de la máquina en la red, no `localhost`), cómo generar los builds con EAS y qué configurar en `app.json` (nombre, íconos, identificadores).
4. Lista de pantallas hechas por rol, y una lista aparte de lo que no pudiste hacer o no pudiste probar.
5. Los 6 pendientes de la sección 8, cada uno con el endpoint que propondrías.

Cuentas de prueba (backend local): cliente `client@example.com` / `Client123!` · vendedor `vendedor@ertweb.com` / `Seller123!` · admin: te la paso aparte.
