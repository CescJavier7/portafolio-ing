#!/bin/sh
# Entrypoint de sentra-api.
#
# Corre las migraciones de Alembic ANTES de levantar Uvicorn, para que un
# deploy con cambio de esquema no deje la API con código nuevo y base vieja
# (que reventaría con 500). Ya no depende de que alguien entre por SSH a
# correr `alembic upgrade head` a mano.
#
# depends_on (condition: service_healthy) en docker-compose ya garantiza que
# Postgres está sano antes de arrancar este contenedor; el retry de abajo es
# solo un colchón por si hay un hipo transitorio de red.
#
# OJO a futuro: si algún día se escala a MÁS DE UNA réplica de sentra-api,
# esto ya no sirve tal cual — dos contenedores correrían la migración a la vez
# (Alembic no es concurrente-seguro). En ese caso, mover la migración a un job
# separado que corra una sola vez, no al arranque de cada réplica.
set -e

echo "[entrypoint] Aplicando migraciones de Alembic..."

n=0
until alembic upgrade head; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "[entrypoint] Alembic falló tras 10 intentos. Abortando."
    exit 1
  fi
  echo "[entrypoint] Reintento $n/10 en 3s (¿Postgres aún no listo?)..."
  sleep 3
done

echo "[entrypoint] Migraciones OK. Levantando Uvicorn..."
# exec: Uvicorn reemplaza al shell → recibe las señales (SIGTERM) directamente,
# para un apagado limpio del contenedor.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'
