from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings

settings = get_settings()

# get_remote_address: OJO, detrás de Traefik esto puede devolver la IP del
# proxy en vez de la real si no está bien configurado `--proxy-headers` /
# forwarded_allow_ips en Uvicorn. Verificar en producción que la IP logueada
# sea la del cliente real, no la de Traefik.
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)