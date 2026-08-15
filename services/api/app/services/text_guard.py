"""
services/text_guard.py

Detecta texto ILEGIBLE antes de mandarlo al LLM. El caso real que motivó esto:
un PDF cuyo extractor devolvió el texto SIN ESPACIOS
("Ene2024ActualidadEspecialista…"). Ese blob rompe la generación (el modelo no
puede segmentarlo bien) y el usuario solo veía un error genérico.

En vez de dejar que llegue a Groq y falle feo, lo detectamos temprano y damos
un mensaje accionable ("pega el texto o sube una foto").
"""

MIN_LEN_TO_CHECK = 120    # textos cortos no se revisan (pueden ser una línea)
MAX_AVG_WORD_LEN = 11     # prosa normal ~5-6; aglutinado (Canva) se dispara
MIN_AVG_WORD_LEN = 1.6    # "E s p a c i o e n t r e t o d o" también es basura
MAX_WORD_RUN = 40         # la "palabra" (run sin whitespace) más larga aceptable


def is_readable_text(text: str) -> bool:
    """
    Detecta si un texto extraído es usable. La señal FUERTE es la longitud media
    de palabra: al separar por CUALQUIER espacio en blanco (incl. saltos de
    línea), la prosa normal da palabras de ~5-6 chars; un PDF de Canva
    (glifos sin caracteres de espacio) da "palabras" enormes → se detecta y se
    fuerza el OCR. También descarta el extremo contrario (un espacio entre cada
    letra), que igual es ilegible para el LLM.
    """
    if len(text) < MIN_LEN_TO_CHECK:
        return True
    words = text.split()  # separa por espacios Y saltos de línea
    if not words:
        return False
    avg_word = sum(len(w) for w in words) / len(words)
    longest = max(len(w) for w in words)
    return MIN_AVG_WORD_LEN <= avg_word <= MAX_AVG_WORD_LEN and longest <= MAX_WORD_RUN


def assert_readable(text: str) -> None:
    """Lanza ValueError si el texto parece una extracción rota (sin espacios)."""
    if not is_readable_text(text):
        raise ValueError(
            "El texto parece haberse extraído sin espacios (PDF/imagen ilegible). "
            "Pégalo manualmente o sube otro archivo más limpio."
        )
