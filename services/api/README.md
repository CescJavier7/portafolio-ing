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
    services/   -> stripe_service.py
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

# Completa STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET y STRIPE_PRICE_ID_PRO
# desde tu dashboard de Stripe (modo test primero, sk_test_... / whsec_...).
```

## 3. Migraciones (Alembic) — falta inicializar

No generé Alembic completo para no inflar la entrega, pero es el siguiente paso obligatorio antes de correr esto:

```bash
pip install -r requirements.txt
alembic init alembic
# En alembic/env.py: importar app.db.base.Base y tus modelos,
# y apuntar target_metadata = Base.metadata
alembic revision --autogenerate -m "init: organizations, users, refresh_tokens"
alembic upgrade head
```

Si quieres, en el próximo paso te dejo el `alembic/env.py` ya configurado — lo salteé aquí para no duplicar trabajo si prefieres revisar primero el resto.

## 4. Probar localmente

```bash
uvicorn app.main:app --reload
# docs en http://localhost:8000/docs (solo si ENVIRONMENT=development)
```

Prueba con `curl` o Postman:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"unaClaveSegura123","organization_name":"Mi Org"}'
```

## 5. Webhook de Stripe en local

Stripe no puede pegarle a `localhost` directo. Usa el CLI de Stripe:
```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
# te da un whsec_... temporal para pruebas locales, distinto al de producción
```

## 6. Checklist de seguridad antes de ir a producción

- [ ] `JWT_SECRET` generado con `secrets.token_urlsafe`, no el placeholder.
- [ ] `.env` real fuera de git (verifica tu `.gitignore`).
- [ ] `ENVIRONMENT=production` en el `.env` del VPS (activa `secureCookie`, oculta `/docs`, agrega HSTS).
- [ ] Stripe en modo **live** (`sk_live_...`) solo cuando todo lo demás esté probado en test.
- [ ] Migrar `_processed_event_ids` (en memoria) a una tabla real antes de tener más de una réplica del contenedor — está marcado con `TODO` en `billing.py`.
- [ ] Implementar el envío real del correo de verificación (`TODO` en `auth.py` — hoy el usuario queda `email_verified=False` sin forma de verificarse todavía; falta ese endpoint + proveedor de email).
- [ ] Confirmar que Traefik SÍ reenvía `X-Forwarded-For` real (afecta tanto el rate limiting como los logs).

## 7. Lo que falta para que el flujo esté 100% cerrado

1. Endpoint `POST /auth/verify-email` (falta implementar).
2. Envío de email real (Resend, SES, Postmark — tú eliges).
3. `alembic/env.py` configurado + primera migración.
4. Conectar esto con el frontend de `/sentinel` (formulario de registro/login).