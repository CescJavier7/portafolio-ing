# Sentra API — Auth + Billing (v0.1)

## 1. Estructura
```
services/api/
  app/
    core/       -> config, seguridad (hashing/JWT), rate limiting
    db/         -> conexión async a Postgres
    models/     -> Organization, User, RefreshToken
    schemas/    -> validación de entrada/salida (Pydantic)
    api/v1/     -> routers: auth.py, billing.py, deps.py
    services/   -> lemonsqueezy_service.py
    main.py
  requirements.txt
  Dockerfile
  .env.example
```

## 2. Primeros pasos

```bash
cd services/api
cp .env.example .env

# Genera un JWT_SECRET real (NO uses el placeholder):
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
# pégalo en .env como JWT_SECRET=...

# Completa LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID,
# LEMONSQUEEZY_VARIANT_ID_PRO y LEMONSQUEEZY_WEBHOOK_SECRET desde tu
# dashboard de Lemon Squeezy (usa el modo Test Mode del dashboard mientras
# no haya ventas reales).
```

## 3. Migraciones (Alembic)

Ya está inicializado (`alembic/env.py` con soporte async para asyncpg). Para
levantar el esquema desde cero:

```bash
pip install -r requirements.txt
alembic upgrade head
```

Si cambias un modelo (columnas, tablas nuevas), genera la migración con:
```bash
alembic revision --autogenerate -m "descripcion del cambio"
alembic upgrade head
```

## 4. Probar localmente

Necesitas 3 cosas corriendo a la vez: Postgres, Redis (rate limiting) y
la propia API. En pestañas de terminal separadas:

```bash
# Terminal A — Redis (si no tienes uno ya corriendo):
docker run -d --name sentra-redis -p 6379:6379 redis:alpine

# Terminal B — la API:
uvicorn app.main:app --reload
# docs en http://localhost:8000/docs (solo si ENVIRONMENT=development)

# Terminal C — pruebas:
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"unaClaveSegura123","organization_name":"Mi Org"}'
```

## 5. Webhook de Lemon Squeezy en local

Lemon Squeezy no puede pegarle a `localhost` directo. Usa un túnel (ngrok,
cloudflared, etc.) para exponer tu `localhost:8000`, y registra esa URL
pública + `/api/v1/billing/webhook` en Dashboard > Settings > Webhooks.
El "Signing secret" que te dan ahí es tu `LEMONSQUEEZY_WEBHOOK_SECRET`.

## 6. Checklist de seguridad antes de ir a producción

- [ ] `JWT_SECRET` generado con `secrets.token_urlsafe`, no el placeholder.
- [ ] `.env` real fuera de git (verifica tu `.gitignore`).
- [ ] `ENVIRONMENT=production` en el `.env` del VPS (activa `secureCookie`, oculta `/docs`, agrega HSTS).
- [ ] Lemon Squeezy fuera de **Test Mode** solo cuando todo lo demás esté probado.
- [ ] Migrar `_processed_event_ids` (en memoria) a una tabla real antes de tener más de una réplica del contenedor — está marcado con `TODO` en `billing.py`.
- [ ] Implementar el envío real del correo de verificación (`TODO` en `auth.py` — hoy el usuario queda `email_verified=False` sin forma de verificarse todavía; falta ese endpoint + proveedor de email).
- [ ] Confirmar que Traefik SÍ reenvía `X-Forwarded-For` real (afecta tanto el rate limiting como los logs).

## 7. Verificación de email (Resend)

Ya implementado: `/register` genera un token de un solo uso (24h, hasheado
SHA-256 en DB) y envía el link por Resend. `GET /auth/verify-email?token=...`
activa la cuenta; `POST /auth/resend-verification` reenvía el correo con
respuesta genérica anti-enumeración. Requiere `RESEND_API_KEY` en `.env`
(la misma key del portafolio Next.js).

## 8. Lo que falta para que el flujo esté 100% cerrado

1. Conectar esto con el frontend de `/sentinel` (formulario de registro/login).
2. Probar el checkout de Lemon Squeezy end-to-end cuando la cuenta salga de revisión.
3. Apuntar `VERIFY_URL_BASE` al frontend cuando exista la página de verificación.
