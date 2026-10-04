"""Prueba de punta a punta del portal: del login a la venta y al chat de WhatsApp.

Corre contra una base SQLite temporal y un n8n simulado (servidor HTTP local),
así que no necesita Postgres ni n8n:

    cd backend && python -m pytest tests -q
"""
import json
import os
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

N8N_KEY = "test-n8n-key"
received: list[tuple[str, dict, str | None]] = []  # (path, body, api key recibida)
n8n_up = {"value": True}


class FakeN8n(BaseHTTPRequestHandler):
    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        received.append((self.path, body, self.headers.get("X-N8N-API-Key")))
        if not n8n_up["value"]:
            self.send_response(500); self.end_headers(); return
        out = {"ok": True}
        if self.path.endswith("whatsapp-schedule"):
            out["meeting_link"] = "https://meet.google.com/abc-defg-hij"
        data = json.dumps(out).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


@pytest.fixture(scope="session")
def client():
    server = HTTPServer(("127.0.0.1", 0), FakeN8n)
    threading.Thread(target=server.serve_forever, daemon=True).start()

    tmp = tempfile.mkdtemp()
    os.environ.update({
        "SECRET_KEY": "test-secret",
        "DATABASE_URL": f"sqlite+aiosqlite:///{tmp}/test.db",
        "ADMIN_EMAIL": "admin@test.com",
        "ADMIN_DEFAULT_PASSWORD": "Admin123!",
        "N8N_API_KEY": N8N_KEY,
        "N8N_WEBHOOK_BASE_URL": f"http://127.0.0.1:{server.server_port}",
        "SEED_DEMO_DATA": "false",
    })
    os.chdir(tmp)  # uploads/ se crea relativo al cwd

    import asyncio
    from fastapi.testclient import TestClient
    from app.core.database import engine
    from app.models import Base
    from app.main import app

    # SQLite no valida claves foráneas por defecto; Postgres sí. Se activan
    # para que el test detecte borrados que en producción fallarían.
    from sqlalchemy import event

    @event.listens_for(engine.sync_engine, "connect")
    def _fk_on(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")

    async def create():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    asyncio.run(create())

    with TestClient(app) as c:
        yield c
    server.shutdown()


def login(client, email, password):
    r = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


N8N = {"X-N8N-API-Key": N8N_KEY}
state: dict = {}


def test_login_and_session(client):
    assert client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "mal"}).status_code == 400
    state["admin"] = login(client, "ADMIN@test.com", "Admin123!")  # el correo no distingue mayúsculas
    me = client.get("/api/v1/auth/me", headers=state["admin"]).json()
    assert me["role"] == "admin" and me["is_active"] is True
    # Token inválido → 401 (el frontend cierra sesión)
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer nope"}).status_code == 401
    # Sin datos demo en producción
    assert client.get("/api/v1/users/?role=all", headers=state["admin"]).json() == [me]


def test_admin_creates_accounts(client):
    a = state["admin"]
    r = client.post("/api/v1/users/", headers=a, json={"name": "Vera Vendedora", "email": "vera@test.com", "password": "Seller123", "role": "seller"})
    assert r.status_code == 201 and r.json()["role"] == "seller"
    state["seller_id"] = r.json()["id"]
    r = client.post("/api/v1/users/", headers=a, json={"name": "Carla Cliente", "email": "carla@test.com", "password": "Client123", "phone": "+58 412 0000001"})
    assert r.status_code == 201 and r.json()["role"] == "client"
    state["client_id"] = r.json()["id"]

    assert client.post("/api/v1/users/", headers=a, json={"name": "x", "email": "CARLA@test.com", "password": "Client123"}).status_code == 400
    assert client.post("/api/v1/users/", headers=a, json={"name": "x", "email": "corta@test.com", "password": "123"}).status_code == 422
    # n8n nunca puede crear cuentas internas
    r = client.post("/api/v1/users/", headers=N8N, json={"name": "Via n8n", "email": "n8n@test.com", "password": "Client123", "role": "admin"})
    assert r.status_code == 201 and r.json()["role"] == "client"
    state["n8n_client_id"] = r.json()["id"]
    assert client.post("/api/v1/users/", headers={"X-N8N-API-Key": "mala"}, json={"name": "x", "email": "y@test.com", "password": "Client123"}).status_code == 401

    assert len(client.get("/api/v1/users/", headers=a).json()) == 2            # solo clientes
    assert len(client.get("/api/v1/users/?role=seller", headers=a).json()) == 1
    assert len(client.get("/api/v1/users/?role=all", headers=a).json()) == 4

    state["seller"] = login(client, "vera@test.com", "Seller123")
    state["client"] = login(client, "carla@test.com", "Client123")


def test_role_boundaries(client):
    s, c = state["seller"], state["client"]
    for path in ("/users/", "/invoices/", "/projects/", "/documents/", "/maintenance/", "/manual-payments/"):
        assert client.get(f"/api/v1{path}", headers=s).status_code == 403, path
        assert client.get(f"/api/v1{path}", headers=c).status_code == 403, path
    assert client.get("/api/v1/whatsapp/conversations", headers=c).status_code == 403
    assert client.get("/api/v1/appointments/", headers=c).status_code == 403
    assert client.get("/api/v1/whatsapp/conversations", headers=s).status_code == 200
    assert client.get("/api/v1/appointments/", headers=s).status_code == 200
    assert client.post("/api/v1/users/", headers=s, json={"name": "x", "email": "z@test.com", "password": "Client123", "role": "admin"}).status_code == 403


def test_admin_account_management(client):
    a = state["admin"]
    me = client.get("/api/v1/auth/me", headers=a).json()
    # No puede dejarse sin acceso
    assert client.put(f"/api/v1/users/{me['id']}", headers=a, json={"role": "seller"}).status_code == 400
    assert client.put(f"/api/v1/users/{me['id']}", headers=a, json={"is_active": False}).status_code == 400
    assert client.delete(f"/api/v1/users/{me['id']}", headers=a).status_code == 400

    # Desactivar una cuenta corta su sesión y su login; reactivar la devuelve
    uid = state["n8n_client_id"]
    tmp = login(client, "n8n@test.com", "Client123")
    assert client.put(f"/api/v1/users/{uid}", headers=a, json={"is_active": False}).status_code == 200
    assert client.get("/api/v1/auth/me", headers=tmp).status_code == 401
    assert client.post("/api/v1/auth/login", data={"username": "n8n@test.com", "password": "Client123"}).status_code == 403
    assert client.put(f"/api/v1/users/{uid}", headers=a, json={"is_active": True, "password": "Nueva1234"}).status_code == 200
    login(client, "n8n@test.com", "Nueva1234")


def test_sale_to_client_portal(client):
    a, c, cid = state["admin"], state["client"], state["client_id"]

    # Proyecto
    r = client.post("/api/v1/projects/", headers=a, json={"client_id": cid, "name": "Web Carla", "phase": "Diseño", "progress_pct": 20})
    assert r.status_code == 201
    pid = r.json()["id"]
    assert client.post("/api/v1/projects/", headers=a, json={"client_id": "no-existe", "name": "x"}).status_code == 404
    assert client.put(f"/api/v1/projects/{pid}", headers=a, json={"progress_pct": 140}).status_code == 422
    assert client.put(f"/api/v1/projects/{pid}", headers=a, json={"phase": "Desarrollo", "progress_pct": 55}).status_code == 200

    # Factura con número automático y sin duplicados
    r = client.post("/api/v1/invoices/", headers=a, json={"client_id": cid, "project_id": pid, "amount": 500, "description": "Anticipo 50%"})
    assert r.status_code == 201 and r.json()["number"].endswith("-001")
    inv = r.json()
    assert client.post("/api/v1/invoices/", headers=a, json={"client_id": cid, "amount": 10, "number": inv["number"]}).status_code == 400
    assert client.post("/api/v1/invoices/", headers=a, json={"client_id": cid, "amount": 0}).status_code == 422

    # Documento requerido
    r = client.post("/api/v1/documents/required", headers=a, json={"client_id": cid, "project_id": pid, "name": "Logo", "doc_type": "branding"})
    assert r.status_code == 201
    doc_id = r.json()["id"]
    # No se puede aprobar algo que el cliente aún no subió
    assert client.put(f"/api/v1/documents/{doc_id}/status", headers=a, json={"status": "approved"}).status_code == 400

    # ── El cliente entra y ve lo suyo ────────────────────────────────────
    assert [p["name"] for p in client.get("/api/v1/projects/me", headers=c).json()] == ["Web Carla"]
    assert client.get("/api/v1/projects/me", headers=c).json()[0]["phase"] == "Desarrollo"
    assert len(client.get("/api/v1/invoices/me", headers=c).json()) == 1
    notifs = client.get("/api/v1/notifications/", headers=c).json()
    assert {n["title"] for n in notifs} >= {"Proyecto creado", "Tu proyecto avanzó", "Nueva factura", "Documento requerido"}
    assert client.get("/api/v1/notifications/unread-count", headers=c).json()["unread"] == len(notifs)
    client.post("/api/v1/notifications/read-all", headers=c)
    assert client.get("/api/v1/notifications/unread-count", headers=c).json()["unread"] == 0
    # Una cuenta nueva no recibe notificaciones inventadas
    assert client.get("/api/v1/notifications/", headers=state["seller"]).json() == []

    # Sube el documento y el admin lo aprueba
    r = client.post(f"/api/v1/documents/{doc_id}/upload", headers=c, files={"file": ("logo.png", b"\x89PNG....", "image/png")})
    assert r.status_code == 200 and r.json()["status"] == "review"
    assert client.post(f"/api/v1/documents/{doc_id}/upload", headers=c, files={"file": ("x.exe", b"MZ", "application/octet-stream")}).status_code == 400
    assert client.put(f"/api/v1/documents/{doc_id}/status", headers=a, json={"status": "cualquiera"}).status_code == 422
    assert client.put(f"/api/v1/documents/{doc_id}/status", headers=a, json={"status": "approved"}).status_code == 200
    assert client.delete(f"/api/v1/documents/{doc_id}", headers=c).status_code == 400  # aprobado: no se borra

    # ── Pago: ya no existe el atajo para marcarse la factura como pagada ─
    assert client.post(f"/api/v1/invoices/{inv['id']}/pay", headers=c).status_code in (404, 405)
    other = login(client, "n8n@test.com", "Nueva1234")
    assert client.post("/api/v1/manual-payments/", headers=other, data={"amount": 500, "invoice_id": inv["id"]}).status_code == 404

    received.clear()
    r = client.post("/api/v1/manual-payments/", headers=c, data={"amount": 500, "invoice_id": inv["id"], "transaction_ref": "TX1"},
                    files={"file": ("pago.png", b"\x89PNG....", "image/png")})
    assert r.status_code == 201
    pay_id = r.json()["id"]
    assert received and received[0][0] == "/webhook/manual-payment-submitted"
    # No se duplica el comprobante mientras está en revisión
    assert client.post("/api/v1/manual-payments/", headers=c, data={"amount": 500, "invoice_id": inv["id"]}).status_code == 400

    # n8n aprueba con su API key → la factura queda pagada
    assert client.put(f"/api/v1/manual-payments/{pay_id}/status", headers=N8N, json={"status": "approved"}).status_code == 200
    assert client.put(f"/api/v1/manual-payments/{pay_id}/status", headers=N8N, json={"status": "approved"}).status_code == 400
    mine = client.get("/api/v1/invoices/me", headers=c).json()[0]
    assert mine["status"] == "paid" and mine["paid_at"]

    # El bot registra un comprobante que llegó por WhatsApp: va a la factura pendiente
    r2 = client.post("/api/v1/invoices/", headers=N8N, json={"client_id": cid, "amount": 500, "description": "Pago final 50%"})
    assert r2.status_code == 201
    body = {"client_id": cid, "amount": 500, "payment_method": "paypal", "transaction_ref": "PP-77", "notes": "Enviado por WhatsApp"}
    assert client.post("/api/v1/manual-payments/n8n", headers=c, json=body).status_code == 401  # solo n8n
    r3 = client.post("/api/v1/manual-payments/n8n", headers=N8N, json=body)
    assert r3.status_code == 201 and r3.json()["invoice_id"] == r2.json()["id"] and r3.json()["status"] == "pending"
    assert client.post("/api/v1/manual-payments/n8n", headers=N8N, json=body).json()["id"] == r3.json()["id"]  # reintento
    assert client.put(f"/api/v1/manual-payments/{r3.json()['id']}/status", headers=N8N, json={"status": "rejected", "admin_notes": "No coincide"}).status_code == 200
    assert client.delete(f"/api/v1/invoices/{r2.json()['id']}", headers=a).status_code == 204
    assert len(client.get("/api/v1/invoices/", headers=N8N).json()) == 1  # n8n lista facturas con su API key

    # Vista "todo en uno" del cliente para el admin y n8n
    ov = client.get(f"/api/v1/users/{cid}/overview", headers=N8N).json()
    assert len(ov["projects"]) == 1 and len(ov["invoices"]) == 1 and len(ov["documents"]) == 1 and len(ov["manual_payments"]) == 2
    state["project_id"] = pid


def test_client_schedules_meeting(client):
    c = state["client"]
    received.clear()
    r = client.post("/api/v1/meetings/schedule", headers=c, json={"meeting_date": "2099-01-15", "time_slot": "10:00 AM", "topic": "Revisión"})
    assert r.status_code == 201 and r.json()["n8n_status"] == "success"
    assert received[0][0] == "/webhook/schedule-meeting" and received[0][2] == N8N_KEY
    assert client.post("/api/v1/meetings/schedule", headers=c, json={"meeting_date": "2099-01-15", "time_slot": "10:00 AM", "topic": "Otra"}).status_code == 409
    assert client.post("/api/v1/meetings/schedule", headers=c, json={"meeting_date": "2001-01-15", "time_slot": "10:00 AM", "topic": "Pasado"}).status_code == 400
    assert client.get("/api/v1/meetings/taken-slots?meeting_date=2099-01-15", headers=c).json() == {"taken": ["10:00 AM"]}
    assert len(client.get("/api/v1/appointments/me", headers=c).json()) == 1


def test_whatsapp_inbox(client):
    s, a = state["seller"], state["admin"]
    wa = "/api/v1/whatsapp"

    # Solo n8n registra mensajes
    msg = {"phone": "584149998877@s.whatsapp.net", "name": "Luis Lead", "text": "Hola, quiero una web", "wa_message_id": "wamid.1"}
    assert client.post(f"{wa}/n8n/messages", json=msg).status_code == 401
    assert client.post(f"{wa}/n8n/messages", headers=s, json=msg).status_code == 401
    r = client.post(f"{wa}/n8n/messages", headers=N8N, json=msg)
    assert r.status_code == 200 and r.json()["ai_enabled"] is True and r.json()["duplicate"] is False
    conv_id = r.json()["conversation_id"]
    assert client.post(f"{wa}/n8n/messages", headers=N8N, json=msg).json()["duplicate"] is True  # reintento de n8n
    # La IA contestó: n8n lo registra como saliente
    client.post(f"{wa}/n8n/messages", headers=N8N, json={"phone": "+58 414-9998877", "text": "¡Hola Luis! ¿Qué tipo de web?", "direction": "out"})

    convs = client.get(f"{wa}/conversations", headers=s).json()
    assert len(convs) == 1 and convs[0]["phone"] == "584149998877" and convs[0]["unread_count"] == 1 and convs[0]["stage"] == "new"
    assert len(client.get(f"{wa}/conversations?search=luis", headers=s).json()) == 1
    assert len(client.get(f"{wa}/conversations?search=nadie", headers=s).json()) == 0

    msgs = client.get(f"{wa}/conversations/{conv_id}/messages", headers=s).json()
    assert [(m["direction"], m["sender"]) for m in msgs] == [("in", "contact"), ("out", "ai")]
    assert client.get(f"{wa}/conversations/{conv_id}", headers=s).json()["unread_count"] == 0  # leído

    # El vendedor apaga la IA de este chat → n8n lo ve al consultar y al registrar
    received.clear()
    r = client.patch(f"{wa}/conversations/{conv_id}", headers=s, json={"ai_enabled": False})
    assert r.status_code == 200 and r.json()["ai_enabled"] is False
    assert received[0][0] == "/webhook/whatsapp-ai-toggle" and received[0][1]["ai_enabled"] is False
    assert client.get(f"{wa}/n8n/ai-status?phone=584149998877", headers=N8N).json()["ai_enabled"] is False
    assert client.post(f"{wa}/n8n/messages", headers=N8N, json={"phone": "584149998877", "text": "¿Siguen ahí?"}).json()["ai_enabled"] is False
    # Un número desconocido usa el interruptor general
    assert client.get(f"{wa}/n8n/ai-status?phone=5800000000", headers=N8N).json()["ai_enabled"] is True

    # El vendedor responde → sale por el webhook de n8n
    received.clear()
    r = client.post(f"{wa}/conversations/{conv_id}/send", headers=s, json={"text": "Hola Luis, soy Vera"})
    assert r.status_code == 200 and r.json()["status"] == "sent" and r.json()["sender"] == "agent"
    path, body, key = received[0]
    assert path == "/webhook/whatsapp-send" and body["phone"] == "584149998877" and body["text"] == "Hola Luis, soy Vera" and key == N8N_KEY
    conv = client.get(f"{wa}/conversations/{conv_id}", headers=s).json()
    assert conv["stage"] == "contacted" and conv["assigned_to"] == state["seller_id"]

    # Si n8n falla el vendedor se entera y el mensaje queda como fallido
    n8n_up["value"] = False
    r = client.post(f"{wa}/conversations/{conv_id}/send", headers=s, json={"text": "¿Te llamo?"})
    assert r.status_code == 502
    n8n_up["value"] = True
    assert client.get(f"{wa}/conversations/{conv_id}/messages", headers=s).json()[-1]["status"] == "failed"

    # n8n también puede pausar/activar (comando del jefe, fusible) y el portal lo refleja
    assert client.put(f"{wa}/n8n/ai-status", headers=s, json={"phone": "584149998877", "ai_enabled": True}).status_code == 401
    assert client.put(f"{wa}/n8n/ai-status", headers=N8N, json={"phone": "+58 414 9998877", "ai_enabled": True}).json()["ai_enabled"] is True
    assert client.get(f"{wa}/conversations/{conv_id}", headers=s).json()["ai_enabled"] is True
    assert client.put(f"{wa}/n8n/ai-status", headers=N8N, json={"phone": "584149998877", "ai_enabled": False}).json()["ai_enabled"] is False

    # Un chat cuyo número es el teléfono de un cliente queda vinculado a su cuenta
    r = client.post(f"{wa}/n8n/messages", headers=N8N, json={"phone": "584120000001", "text": "Hola, soy Carla"})
    linked = client.get(f"{wa}/conversations/{r.json()['conversation_id']}", headers=s).json()
    assert linked["client_id"] == state["client_id"] and linked["stage"] == "won"

    # Interruptor general de la IA
    assert client.put(f"{wa}/settings", headers=s, json={"ai_enabled": False}).status_code == 200
    assert client.get(f"{wa}/n8n/ai-status?phone=5800000000", headers=N8N).json()["ai_enabled"] is False
    client.put(f"{wa}/settings", headers=a, json={"ai_enabled": True})
    client.patch(f"{wa}/conversations/{conv_id}", headers=s, json={"ai_enabled": True, "stage": "negotiation", "notes": "Quiere landing"})
    assert client.get(f"{wa}/n8n/ai-status?phone=584149998877", headers=N8N).json()["ai_enabled"] is True
    assert client.patch(f"{wa}/conversations/{conv_id}", headers=s, json={"stage": "inventada"}).status_code == 422

    # Agenda una cita con el lead → workflow de agendamiento + link de Meet
    received.clear()
    r = client.post(f"{wa}/conversations/{conv_id}/appointment", headers=s,
                    json={"title": "Llamada de descubrimiento", "appointment_date": "2099-02-01", "time_slot": "02:30 PM"})
    assert r.status_code == 200 and r.json()["n8n_status"] == "success"
    appt = r.json()["appointment"]
    assert appt["meeting_link"] == "https://meet.google.com/abc-defg-hij" and appt["client_id"] is None and appt["contact_phone"] == "584149998877"
    path, body, _ = received[0]
    assert path == "/webhook/whatsapp-schedule" and body["start_datetime"] == "2099-02-01T14:30:00" and body["timezone"] == "America/Caracas"
    assert any(x["id"] == appt["id"] for x in client.get("/api/v1/appointments/", headers=s).json())

    # Venta cerrada: el vendedor crea la cuenta del cliente desde el chat
    r = client.post(f"{wa}/conversations/{conv_id}/convert", headers=s, json={"name": "Luis Lead", "email": "luis@test.com", "password": "Luis12345"})
    assert r.status_code == 201 and r.json()["role"] == "client" and r.json()["phone"] == "584149998877"
    assert client.post(f"{wa}/conversations/{conv_id}/convert", headers=s, json={"name": "x", "email": "otro@test.com", "password": "Luis12345"}).status_code == 400
    assert client.get(f"{wa}/conversations/{conv_id}", headers=s).json()["stage"] == "won"
    luis = login(client, "luis@test.com", "Luis12345")
    assert client.get("/api/v1/projects/me", headers=luis).json() == []
    state["conv_id"], state["luis_id"] = conv_id, r.json()["id"]


def test_staff_appointments(client):
    s, a = state["seller"], state["admin"]
    r = client.post("/api/v1/appointments/", headers=s, json={"title": "Demo", "appointment_date": "2099-03-01", "time_slot": "09:00 AM", "contact_name": "Ana", "contact_phone": "58412"})
    assert r.status_code == 201 and r.json()["source"] == "seller"
    mine = r.json()["id"]
    assert client.post("/api/v1/appointments/", headers=s, json={"title": "Sin nadie", "appointment_date": "2099-03-01", "time_slot": "09:00 AM"}).status_code == 400
    r = client.post("/api/v1/appointments/", headers=a, json={"title": "Kickoff", "appointment_date": "2099-03-02", "time_slot": "09:00 AM", "client_id": state["client_id"]})
    assert r.status_code == 201
    admins = r.json()["id"]
    assert client.put(f"/api/v1/appointments/{mine}", headers=s, json={"status": "completed"}).json()["status"] == "completed"
    assert client.delete(f"/api/v1/appointments/{admins}", headers=s).status_code == 403
    assert client.delete(f"/api/v1/appointments/{mine}", headers=s).status_code == 204


def test_delete_accounts_with_data(client):
    a = state["admin"]
    # Cliente con proyecto, factura, documento, pago, cita y notificaciones
    assert client.delete(f"/api/v1/users/{state['client_id']}", headers=a).status_code == 204
    assert client.get("/api/v1/projects/", headers=a).json() == []
    assert client.get("/api/v1/invoices/", headers=a).json() == []
    assert client.get("/api/v1/auth/me", headers=state["client"]).status_code == 401
    # Cliente vinculado a un chat y vendedor con chats asignados: el chat se conserva
    assert client.delete(f"/api/v1/users/{state['luis_id']}", headers=a).status_code == 204
    assert client.delete(f"/api/v1/users/{state['seller_id']}", headers=a).status_code == 204
    conv = client.get(f"/api/v1/whatsapp/conversations/{state['conv_id']}", headers=a).json()
    assert conv["client_id"] is None and conv["assigned_to"] is None
    assert len(client.get(f"/api/v1/whatsapp/conversations/{state['conv_id']}/messages", headers=a).json()) == 5
