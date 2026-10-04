# Portal Client ErtWeb

Este repositorio contiene el cliente web y la API para el Portal Client ErtWeb. El proyecto está dividido en un Frontend (React/Vite) y un Backend (FastAPI).

## Requisitos Previos

- **Node.js** (v18+)
- **Python** (3.10+; para generar PDFs en local hace falta Pango — en Docker ya viene)
- **Docker** y **Docker Compose** (opcional para correr la base de datos de PostgreSQL)

---

## 1. Instalación y Ejecución de la Base de Datos (PostgreSQL)

El proyecto incluye un archivo `docker-compose.yml` para levantar una base de datos local fácilmente.

```bash
# Iniciar la base de datos en segundo plano
docker-compose up -d
```

---

## 2. Instalación y Ejecución del Backend (FastAPI)

El backend está desarrollado con FastAPI y utiliza SQLAlchemy para la base de datos.

### Pasos:

1. Entra al directorio del backend:
   ```bash
   cd backend
   ```
2. Crea un entorno virtual (recomendado):
   ```bash
   python -m venv venv
   ```
3. Activa el entorno virtual:
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **Linux/Mac:**
     ```bash
     source venv/bin/activate
     ```
4. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```
5. Ejecuta el servidor de desarrollo:
   ```bash
   uvicorn app.main:app --reload
   ```
   > El servidor estará disponible en `http://localhost:8000` y la documentación de la API en `http://localhost:8000/docs`.

---

## 3. Instalación y Ejecución del Frontend (React + Vite)

El frontend utiliza React, Vite y TailwindCSS.

### Pasos:

1. Entra al directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias de Node:
   ```bash
   npm install
   ```
3. Ejecuta el entorno de desarrollo:
   ```bash
   npm run dev
   ```
   > El servidor estará disponible normalmente en `http://localhost:5173`.

---

## 4. Roles y cuentas

| Rol | Entra a | Puede |
|---|---|---|
| `admin` | `/admin` | Todo: cuentas, proyectos, facturación, pagos, documentos, WhatsApp, pipeline y agenda |
| `seller` (vendedor) | `/seller` | Bandeja de WhatsApp, activar/pausar la IA, pipeline de leads, agenda y crear la cuenta del cliente al cerrar una venta |
| `client` | `/dashboard` | Su proyecto, documentos, facturas, pagos, agenda y mantenimiento |

Las cuentas se crean desde **Admin → Cuentas → Nueva cuenta** (también se puede editar, cambiar la contraseña,
desactivar o eliminar). El primer admin se crea al arrancar con `ADMIN_EMAIL` / `ADMIN_DEFAULT_PASSWORD` del `.env`.

Para desarrollo local con datos de ejemplo: `SEED_DEMO_DATA=true` crea `client@example.com` con proyectos y facturas de prueba.
**En producción debe quedar en `false`.**

## 5. WhatsApp y n8n

La conexión de la bandeja de WhatsApp con n8n (qué endpoint llama n8n y qué webhooks dispara el portal) está en
[N8N_WHATSAPP.md](N8N_WHATSAPP.md). Todas las rutas de la API: [API_ROUTES.md](API_ROUTES.md).

## 6. Tests

```bash
cd backend
python -m pytest tests -q
```

Prueba el flujo completo (login → cuentas → proyecto y factura → portal del cliente → pago → WhatsApp → agenda)
contra una base SQLite temporal y un n8n simulado; no necesita Postgres ni n8n.

## 7. Despliegue

- Copia `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env`, y completa los valores.
- Las migraciones corren solas al arrancar el contenedor (`alembic upgrade head`).
- Los archivos subidos viven en el volumen `uploads_data`.
