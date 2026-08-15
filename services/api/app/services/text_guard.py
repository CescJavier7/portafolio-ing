"""
services/text_guard.py

Detecta texto ILEGIBLE antes de mandarlo al LLM. El caso real que motivó esto:
un PDF cuyo extractor devolvió el texto SIN ESPACIOS
("Ene2024ActualidadEspecialista…"). Ese blob rompe la generación (el modelo no
puede segmentarlo bien) y el usuario solo veía un error genérico.

En vez de dejar que llegue a Groq y falle feo, lo detectamos temprano y damos
un mensaje accionable ("pega el texto o sube una foto").
"""

MIN_LEN_TO_CHECK = 200   # textos cortos no se revisan (pueden ser una línea)
MIN_SPACE_RATIO = 0.04   # texto normal ~15%; un blob sin espacios ~0-2%
MAX_WORD_RUN = 60        # una "palabra" (run sin espacio) más larga = roto


def is_readable_text(text: str) -> bool:
    n = len(text)
    if n < MIN_LEN_TO_CHECK:
        return True
    space_ratio = text.count(" ") / n
    longest_run = max((len(w) for w in text.split()), default=0)
    return space_ratio >= MIN_SPACE_RATIO and longest_run <= MAX_WORD_RUN


def assert_readable(text: str) -> None:
    """Lanza ValueError si el texto parece una extracción rota (sin espacios)."""
    if not is_readable_text(text):
        raise ValueError(
            "El texto parece haberse extraído sin espacios (PDF/imagen ilegible). "
            "Pégalo manualmente o sube otro archivo más limpio."
        )
