"""
Generación de PDFs (recibos y términos y condiciones) para el portal y n8n.

Las plantillas viven en app/assets/*.html con placeholders Jinja2.
El logo se incrusta como data URI base64 para que el PDF sea autocontenido.
"""
import base64
from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

_env = Environment(
    loader=FileSystemLoader(ASSETS_DIR),
    autoescape=select_autoescape(["html"]),
)


@lru_cache(maxsize=1)
def _logo_data_uri() -> str:
    logo_bytes = (ASSETS_DIR / "ert_4x-8.png").read_bytes()
    return "data:image/png;base64," + base64.b64encode(logo_bytes).decode("ascii")


def render_pdf(template_name: str, context: dict) -> bytes:
    """Renderiza una plantilla de app/assets a PDF. Bloqueante: llamar con
    run_in_threadpool desde endpoints async."""
    html = _env.get_template(template_name).render(logo_src=_logo_data_uri(), **context)
    return HTML(string=html).write_pdf()
