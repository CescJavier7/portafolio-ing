"""
services/file_guard.py

Validación estricta de archivos subidos (CV en PDF, foto de oferta/perfil).
Regla de oro: NUNCA confiar en la extensión ni en el Content-Type que manda el
cliente — ambos se falsifican trivialmente. Validamos por FIRMA (magic numbers)
del contenido real.

Todo se procesa EN MEMORIA; jamás se escribe al disco del VPS.
"""

MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB

# Firmas (primeros bytes) de los únicos tipos que aceptamos.
_SIGNATURES: list[tuple[bytes, str]] = [
    (b"%PDF-", "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
]


def sniff_mime(data: bytes) -> str | None:
    """Devuelve el MIME real según los magic numbers, o None si no reconoce."""
    for signature, mime in _SIGNATURES:
        if data.startswith(signature):
            return mime
    return None


def validate_upload(data: bytes, allowed_mimes: set[str]) -> str:
    """
    Valida tamaño y tipo REAL. Devuelve el MIME detectado o lanza ValueError
    con un mensaje claro (el router lo convierte en 4xx legible).
    """
    if not data:
        raise ValueError("El archivo está vacío.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("El archivo supera el límite de 5 MB.")

    mime = sniff_mime(data)
    if mime is None or mime not in allowed_mimes:
        # No revelamos qué detectamos: no ayudamos a calibrar un bypass.
        raise ValueError("Formato no permitido. Sube un PDF, JPG o PNG válido.")
    return mime


def wipe(buf: bytearray) -> None:
    """
    Sobrescribe con ceros un bytearray tras procesarlo (defensa en profundidad).
    Nota honesta: en CPython no se puede zerar un `bytes` inmutable; por eso el
    caller trabaja sobre bytearray cuando quiere este borrado explícito. El GC
    reclama el resto — nada de esto toca disco.
    """
    for i in range(len(buf)):
        buf[i] = 0
