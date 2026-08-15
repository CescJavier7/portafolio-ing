"""
services/pdf_service.py

Extracción de texto de un PDF (el CV/perfil que sube el usuario) con pypdf.
Import lazy: pypdf solo se carga al procesar un PDF, no en el arranque.

Limitación conocida: pypdf lee la CAPA DE TEXTO del PDF. Si el PDF es un
escaneo (una imagen sin texto), no habrá nada que extraer → devolvemos
cadena vacía y el router avisa al usuario que pegue el texto o suba una foto
(que sí pasa por OCR). El OCR de PDFs escaneados queda como mejora futura.

SEGURIDAD: el texto extraído es input NO confiable (podría llevar inyección
de prompt). Aquí solo se sanea a nivel de caracteres/longitud; la defensa
contra inyección vive en cv_service.py (lo mete como DATOS delimitados).
"""
import io
import re

MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PDF_PAGES = 15                 # un CV/perfil no necesita más
MAX_TEXT_CHARS = 15000


def _sanitize(text: str) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:MAX_TEXT_CHARS]


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise ValueError("El PDF es demasiado grande (máximo 10 MB).")

    from pypdf import PdfReader  # lazy
    from pypdf.errors import PdfReadError  # lazy

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except (PdfReadError, OSError, ValueError):
        raise ValueError("El archivo no es un PDF válido o está dañado.")

    # PDFs cifrados sin contraseña: pypdf a veces expone páginas vacías.
    if getattr(reader, "is_encrypted", False):
        try:
            reader.decrypt("")  # intento con contraseña vacía
        except Exception:
            raise ValueError("El PDF está protegido con contraseña.")

    parts: list[str] = []
    for page in reader.pages[:MAX_PDF_PAGES]:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue  # una página ilegible no debe tumbar todo

    text = _sanitize("\n".join(parts))
    if not text:
        raise ValueError(
            "No pudimos extraer texto de este PDF (¿es un escaneo/imagen?). "
            "Pega tu experiencia manualmente o sube una foto."
        )
    return text
