FROM python:3.12-slim

# Tesseract OCR (+ packs de idioma español e inglés) para el generador de CV:
# pytesseract es solo un wrapper, necesita el binario del sistema. Se limpia
# el cache de apt en la misma capa para no engordar la imagen.
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Usuario no-root: si el contenedor se compromete, el proceso no corre
# como root dentro del contenedor (reduce el radio de daño de un escape).
RUN useradd --create-home --shell /bin/bash sentra

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

# Entrypoint: corre las migraciones y luego Uvicorn. chmod como root (antes de
# bajar de privilegios) para asegurar el bit de ejecución sin depender de los
# permisos del archivo en el repo.
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER sentra

EXPOSE 8000

# El ENTRYPOINT asume el arranque de Uvicorn (ver entrypoint.sh). El
# "--forwarded-allow-ips=*" vive ahí: confía en X-Forwarded-For de CUALQUIER
# origen, seguro SOLO porque este contenedor no se expone directo a internet
# (solo Traefik lo alcanza por la red interna). Si algún día publicas el
# puerto 8000 al host, restringe esa IP a la de Traefik.
ENTRYPOINT ["/app/entrypoint.sh"]