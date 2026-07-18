FROM python:3.12-slim

# Usuario no-root: si el contenedor se compromete, el proceso no corre
# como root dentro del contenedor (reduce el radio de daño de un escape).
RUN useradd --create-home --shell /bin/bash sentra

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

COPY app ./app

USER sentra

EXPOSE 8000

# ⚠️ "--forwarded-allow-ips=*" confía en X-Forwarded-For de CUALQUIER origen.
# Es seguro únicamente porque este contenedor NO se expone directamente a
# internet (solo Traefik lo alcanza, dentro de la red interna de Docker).
# Si alguna vez publicas el puerto 8000 directo al host, cambia esto a la
# IP/subred real de Traefik, o cualquiera podría spoofear su IP de origen
# y burlar el rate limiting por IP.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]