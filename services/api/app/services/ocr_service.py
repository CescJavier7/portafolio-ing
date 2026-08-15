"""
services/ocr_service.py

Extracción de texto de una imagen de oferta laboral con Tesseract. El usuario
sube una foto; aquí sacamos el texto para que LO REVISE antes de generar el CV
(no confiamos en el OCR a ciegas: puede equivocarse, y así el usuario corrige).

Los imports de Pillow/pytesseract son lazy (dentro de la función): no se cargan
en el arranque de la API ni obligan a tenerlos instalados para importar el
resto del backend — solo se necesitan al procesar una imagen.

SEGURIDAD: el texto que sale de aquí es input NO confiable (una imagen podría
llevar texto de inyección de prompt). Aquí solo se sanea a nivel de caracteres
y longitud; la defensa contra inyección de prompt vive en cv_service.py, que
mete este texto como DATOS delimitados, nunca como instrucciones.
"""
import io
import re

MAX_OCR_CHARS = 15000
MAX_IMAGE_BYTES = 8 * 1024 * 1024  # 8 MB


def sanitize_ocr_text(text: str) -> str:
    # Quita caracteres de control (menos \n y \t), colapsa espacios y saltos,
    # y corta a un tope razonable.
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()[:MAX_OCR_CHARS]


def extract_text_from_image(image_bytes: bytes) -> str:
    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise ValueError("La imagen es demasiado grande (máximo 8 MB).")

    from PIL import Image, UnidentifiedImageError  # lazy
    import pytesseract  # lazy

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img.load()  # fuerza la decodificación aquí (detecta imágenes corruptas)
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValueError("El archivo no es una imagen válida.")

    # spa+eng: las ofertas suelen estar en español o inglés. Requiere los packs
    # tesseract-ocr-spa y tesseract-ocr-eng instalados en la imagen (ver Dockerfile).
    raw = pytesseract.image_to_string(img, lang="spa+eng")
    return sanitize_ocr_text(raw)
