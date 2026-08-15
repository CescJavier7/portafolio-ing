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

from app.services.text_guard import is_readable_text

MAX_PDF_PAGES = 15                 # un CV/perfil no necesita más
MAX_OCR_PAGES = 5                  # el OCR es caro: acota el fallback
MAX_TEXT_CHARS = 15000


def _sanitize(text: str) -> str:
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:MAX_TEXT_CHARS]


def _extract(reader, mode: str | None) -> str:
    parts: list[str] = []
    for page in reader.pages[:MAX_PDF_PAGES]:
        try:
            parts.append(page.extract_text(extraction_mode=mode) if mode else page.extract_text() or "")
        except Exception:
            continue  # una página ilegible no debe tumbar todo
    return _sanitize("\n".join(p or "" for p in parts))


def _ocr_pdf(pdf_bytes: bytes) -> str:
    """
    Último recurso para PDFs sin capa de texto usable (Canva posiciona cada
    glifo de forma absoluta y NO emite caracteres de espacio → la extracción
    sale pegada). Renderizamos cada página a imagen EN MEMORIA con PyMuPDF y la
    pasamos por Tesseract. Cero disco: todo son buffers en RAM.
    """
    import fitz  # PyMuPDF, lazy
    from PIL import Image  # lazy
    import pytesseract  # lazy

    parts: list[str] = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        for i in range(min(len(doc), MAX_OCR_PAGES)):
            # 200 DPI: buen balance nitidez/tiempo para OCR de texto.
            pix = doc[i].get_pixmap(dpi=200, colorspace=fitz.csRGB, alpha=False)
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            parts.append(pytesseract.image_to_string(img, lang="spa+eng"))
            img.close()
    finally:
        doc.close()
    return _sanitize("\n".join(parts))


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """El tamaño y el tipo REAL ya se validaron en file_guard antes de llamar aquí."""
    from pypdf import PdfReader  # lazy
    from pypdf.errors import PdfReadError  # lazy

    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except (PdfReadError, OSError, ValueError):
        raise ValueError("El archivo no es un PDF válido o está dañado.")

    if getattr(reader, "is_encrypted", False):
        try:
            reader.decrypt("")  # intento con contraseña vacía
        except Exception:
            raise ValueError("El PDF está protegido con contraseña.")

    # 1) Modo por defecto. 2) Si sale ilegible, modo "layout" (reinserta
    # espacios por posición). 3) Si SIGUE ilegible (caso Canva: sin glifos de
    # espacio), fallback definitivo: renderizar a imagen y OCR.
    text = _extract(reader, None)
    if not is_readable_text(text):
        layout = _extract(reader, "layout")
        if is_readable_text(layout) or len(layout) > len(text):
            text = layout

    if not is_readable_text(text):
        try:
            ocr = _ocr_pdf(pdf_bytes)
        except Exception as exc:
            print(f"[PDF] Fallback OCR falló: {exc}")
            ocr = ""
        if ocr and (is_readable_text(ocr) or len(ocr) > len(text)):
            text = ocr

    if not text:
        raise ValueError(
            "No pudimos extraer texto de este PDF (¿es un escaneo/imagen?). "
            "Pega tu experiencia manualmente o sube una foto."
        )
    if not is_readable_text(text):
        raise ValueError(
            "El PDF no dejó texto legible ni siquiera con OCR. "
            "Pega tu experiencia manualmente o sube una foto más nítida."
        )
    return text
