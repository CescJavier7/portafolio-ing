@AGENTS.md
## Sesión — Servicios, Sentra, seguridad del perímetro (2026-07)

### Estado tras esta sesión

**Middleware (`middleware.ts`)** — reescrito. Antes excluía `/meka-admin` y
`/api/*` del matcher, así que NO había ninguna verificación de sesión ahí.
Ahora usa `getToken()` de `next-auth/jwt` (edge-safe, no importa `auth.ts`
completo porque este carga Prisma/bcrypt, incompatibles con Edge Runtime).

- Protege `/meka-admin/*` (redirect a login) y `/api/admin/*` (401 JSON).
- `AdminUser` NO tiene roles todavía: el check es solo "¿existe un JWT
  válido?", igual que en `actions.ts`. Si más adelante se agregan roles
  (columna `role` en Prisma + devolverlo en `authorize()` + copiarlo en
  el callback `jwt()`), hay que volver a añadir el check de rol aquí.
- `secureCookie: true` forzado en producción (`NODE_ENV === 'production'`)
  porque detrás de Traefik la autodetección de HTTPS fallaba y `getToken()`
  buscaba la cookie sin el prefijo `__Secure-`, causando un loop de
  redirects infinito en el login de `/meka-admin`.

**Navegación (`components/NavBar.tsx`)** — rediseñada estilo Apple.
Antes: 8 links sueltos. Ahora: **Sobre mí** (mega-dropdown con Académico,
Habilidades, Certificados, Experiencia, Contacto — todo lo que vive como
anclas en el home), **Servicios**, **Sentra**, **Blog**. Responsive con
acordeón en mobile.

**Apartado de Servicios** — nuevo, en `/[lang]/services`
(`components/ServicesApple.tsx`). Tres bloques: Desarrollo de Software,
Ciberseguridad (con CTA hacia `/sentinel`), Docencia Informática
(software, ciberseguridad, matemáticas, tesis).

**Sentra** — nombre elegido para el SaaS de auditoría de seguridad
(antes referido como "SentinelAudit" / "SentinelSecurityX" en la
planificación). Landing/teaser en `/[lang]/sentinel`
(`components/SentinelLanding.tsx`) — modo "en desarrollo", sin backend
real todavía, con CTA a contacto/early access.

**Diccionarios (`dictionaries/es.json`, `dictionaries/en.json`)** —
reestructurado `navigation` para el nuevo NavBar, agregados los bloques
`services` y `sentinel`.

**Chat IA (`lib/services/chat.service.ts`)** — `MEKA_JAVIER_OS` ahora:
- Detecta intención "Sentra/Sentinel" en `detectAction()` (prioridad alta,
  antes que el resto) y responde con un pitch curado a mano (no depende
  del LLM), abriendo `/{lang}/sentinel` en pestaña nueva.
- `SYSTEM_INSTRUCTION` ampliado con bloque `[PROYECTO INSIGNIA: SENTRA]`
  para menciones orgánicas, más una regla anti-alucinación explícita:
  Sentra NO está en producción, no tiene usuarios reales — la IA no debe
  afirmar lo contrario.

### Documento de referencia
Arquitectura completa de Sentra (visión, modelo de datos, API, stack,
roadmap MVP→Enterprise, riesgos, costos, monetización) generada en la
primera sesión — pedir el documento completo si se necesita retomar el
diseño del backend.

### Pendiente / próximos pasos sugeridos (en orden)
1. **Sistema de auth propio de Sentra** (registro/login de usuarios y
   organizaciones — NO confundir con el login de `/meka-admin`, que es
   solo para el panel de administración del portafolio).
2. Modelo `Target` + verificación de dominio por DNS TXT.
3. Scanner pasivo mínimo (headers + SSL + DNS), sin Celery aún.
4. Scoring engine v1.
5. Orquestador Celery (recién se justifica con más de un scanner).
6. Stripe webhooks.
7. RAG/pgvector para los reportes con IA.

## Sesión — Servicios, Sentra, seguridad del perímetro (2026-07)

### Estado tras esta sesión

**Middleware (`middleware.ts`)** — reescrito. Antes excluía `/meka-admin` y
`/api/*` del matcher, así que NO había ninguna verificación de sesión ahí.
Ahora usa `getToken()` de `next-auth/jwt` (edge-safe, no importa `auth.ts`
completo porque este carga Prisma/bcrypt, incompatibles con Edge Runtime).

- Protege `/meka-admin/*` (redirect a login) y `/api/admin/*` (401 JSON).
- `AdminUser` NO tiene roles todavía: el check es solo "¿existe un JWT
  válido?", igual que en `actions.ts`. Si más adelante se agregan roles
  (columna `role` en Prisma + devolverlo en `authorize()` + copiarlo en
  el callback `jwt()`), hay que volver a añadir el check de rol aquí.
- `secureCookie: true` forzado en producción (`NODE_ENV === 'production'`)
  porque detrás de Traefik la autodetección de HTTPS fallaba y `getToken()`
  buscaba la cookie sin el prefijo `__Secure-`, causando un loop de
  redirects infinito en el login de `/meka-admin`.

**Navegación (`components/NavBar.tsx`)** — rediseñada estilo Apple.
Antes: 8 links sueltos. Ahora: **Sobre mí** (mega-dropdown con Académico,
Habilidades, Certificados, Experiencia, Contacto — todo lo que vive como
anclas en el home), **Servicios**, **Sentra**, **Blog**. Responsive con
acordeón en mobile.

**Apartado de Servicios** — nuevo, en `/[lang]/services`
(`components/ServicesApple.tsx`). Tres bloques: Desarrollo de Software,
Ciberseguridad (con CTA hacia `/sentinel`), Docencia Informática
(software, ciberseguridad, matemáticas, tesis).

**Sentra** — nombre elegido para el SaaS de auditoría de seguridad
(antes referido como "SentinelAudit" / "SentinelSecurityX" en la
planificación). Landing/teaser en `/[lang]/sentinel`
(`components/SentinelLanding.tsx`) — modo "en desarrollo", sin backend
real todavía, con CTA a contacto/early access.

**Diccionarios (`dictionaries/es.json`, `dictionaries/en.json`)** —
reestructurado `navigation` para el nuevo NavBar, agregados los bloques
`services` y `sentinel`.

**Chat IA (`lib/services/chat.service.ts`)** — `MEKA_JAVIER_OS` ahora:
- Detecta intención "Sentra/Sentinel" en `detectAction()` (prioridad alta,
  antes que el resto) y responde con un pitch curado a mano (no depende
  del LLM), abriendo `/{lang}/sentinel` en pestaña nueva.
- `SYSTEM_INSTRUCTION` ampliado con bloque `[PROYECTO INSIGNIA: SENTRA]`
  para menciones orgánicas, más una regla anti-alucinación explícita:
  Sentra NO está en producción, no tiene usuarios reales — la IA no debe
  afirmar lo contrario.

### Documento de referencia
Arquitectura completa de Sentra (visión, modelo de datos, API, stack,
roadmap MVP→Enterprise, riesgos, costos, monetización) generada en la
primera sesión — pedir el documento completo si se necesita retomar el
diseño del backend.

### Pendiente / próximos pasos sugeridos (en orden)
1. **Sistema de auth propio de Sentra** — EN PROGRESO, ver detalle abajo.
2. Modelo `Target` + verificación de dominio por DNS TXT.
3. Scanner pasivo mínimo (headers + SSL + DNS), sin Celery aún.
4. Scoring engine v1.
5. Orquestador Celery (recién se justifica con más de un scanner).
6. Stripe webhooks — ya implementado a nivel de código, falta probar end-to-end.
7. RAG/pgvector para los reportes con IA.

## Sesión 2 — Backend de Sentra: Auth + Stripe (2026-07)

### Qué se construyó
Servicio nuevo **`services/api/`** (FastAPI, separado del repo Next.js,
mismo monorepo). Vive en `api.cescjavier.dev`. Incluye:

- **Modelos** (`app/models/`): `Organization`, `User`, `RefreshToken` —
  UUID como PK (no IDs secuenciales, evita enumeración).
- **Seguridad** (`app/core/security.py`): hashing Argon2id (no bcrypt),
  access tokens JWT de 15 min, refresh tokens opacos (no JWT) guardados
  hasheados en DB con rotación + detección de reuso (si un refresh
  robado se reutiliza, se revoca toda la "familia" de tokens).
- **Auth** (`app/api/v1/auth.py`): register/login/refresh/logout.
  Rate limiting con slowapi+Redis, bloqueo de cuenta tras 5 intentos
  fallidos, mensajes de error idénticos para no filtrar si un email
  existe, `email_verified` obligatorio antes de poder loguear.
- **Billing** (`app/api/v1/billing.py` + `app/services/stripe_service.py`):
  Checkout Session + webhook con verificación de firma sobre bytes
  crudos + idempotencia por `event.id` (esto último en memoria por
  ahora — marcado TODO, hay que pasarlo a tabla antes de escalar a
  >1 réplica).
- **Config** (`app/core/config.py`): Pydantic Settings, falla al
  arrancar si falta un secreto.

### TODOs reales pendientes en el código (no asumir que están resueltos)
- `POST /auth/verify-email` — el endpoint NO existe todavía. Un usuario
  se registra pero no hay forma de que verifique su correo, así que
  hoy el login SIEMPRE falla con "verifica tu correo" tras registrarse.
  Bloqueante para probar el flujo completo.
- Envío de email real — ningún proveedor conectado (Resend/SES/Postmark
  pendiente de elegir e integrar).
- `_processed_event_ids` del webhook de Stripe vive en memoria
  (`app/api/v1/billing.py`) — se pierde en cada restart.
- `alembic/env.py` fue reemplazado por una versión async custom
  (el default que genera `alembic init` es síncrono e incompatible
  con asyncpg) — ya está hecho, pegado a mano tras `alembic init alembic`.

### Entorno de desarrollo (para no repetir el infierno de setup)
- Mac del usuario: hubo un bug real de Homebrew (`python@3.12` con
  `pyexpat`/`libexpat` con símbolos desalineados, rompía `ensurepip`
  incluso reinstalando). Se resolvió instalando Python 3.12 desde el
  instalador oficial de **python.org** (no Homebrew), en
  `/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12`.
  El venv de `services/api/venv` se creó con ESE binario, no con el de
  Homebrew. Si se reinstala el entorno desde cero, usar esa ruta.
- Todas las dependencias de `requirements.txt` instalan limpio con
  ese Python.

### Estado justo ahora (para retomar sin perder contexto)
- Acabamos de correr `alembic init alembic` dentro de `services/api`.
- Falta: reemplazar `alembic/env.py` con la versión async (ya generada
  y entregada), limpiar el placeholder `sqlalchemy.url` de
  `alembic.ini`, confirmar si hay un Postgres ya corriendo (vía Docker,
  compartido con el resto del portafolio) o si hay que levantar uno,
  crear la base `sentra` dentro, correr la primera migración
  (`alembic revision --autogenerate` + `alembic upgrade head`), y
  recién ahí probar `uvicorn app.main:app --reload` +
  `POST /auth/register`.
## Sesión 3 — Lemon Squeezy, deploy de sentra-api, verificación de email (2026-07-18)

### HITO: auth de Sentra funcionando end-to-end EN PRODUCCIÓN
register → correo (Resend) → verify-email → login con access_token,
probado contra https://api.cescjavier.dev con el correo real del usuario.

### Qué se hizo
- **`app/main.py` estaba corrupto en git** (contenía una copia de auth.py,
  commiteado así en e0777aa; uvicorn fallaba con "Attribute app not found").
  Reescrito: FastAPI + CORS + slowapi (`_rate_limit_exceeded_handler` es
  función a nivel de MÓDULO slowapi, no método del Limiter) + routers +
  /health. Docs ocultas en producción.
- **Stripe → Lemon Squeezy** (decisión: el usuario no tiene RUC; LS es
  Merchant of Record y permite vender como individuo). `stripe_service.py`
  eliminado; `lemonsqueezy_service.py` nuevo (API REST con `requests`,
  webhook verificado con HMAC-SHA256 del body crudo, header `X-Signature`).
  `Organization`: columnas renombradas a `lemonsqueezy_customer_id` /
  `lemonsqueezy_subscription_id` (migración 57d92ffe4b8e). `/register` ya
  NO crea customer remoto: LS lo asocia al primer checkout vía webhook
  (`meta.custom_data.organization_id`). Config: `LEMONSQUEEZY_API_KEY`,
  `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_VARIANT_ID_PRO` (=1921751, Test
  Mode), `LEMONSQUEEZY_WEBHOOK_SECRET`.
- **Cuenta LS**: store "Sentra", producto "Sentra Pro" $30/mes suscripción.
  Cuenta EN REVISIÓN → todo en Test Mode. Al aprobarse: generar key/variant/
  webhook de Live (Test y Live no comparten nada).
- **Deploy en VPS**: `sentra-api` + `sentra-redis` agregados al
  docker-compose.yml principal (comparten `portfolio-db`, base `sentra`
  separada). Traefik: Host `api.cescjavier.dev` (DNS A "api" → droplet,
  proxied por Cloudflare, TLS igual que portfolio-app). `deploy.yml` ahora
  reconstruye los 3 servicios. Dockerfile copia `alembic/` + `alembic.ini`.
- **GOTCHA CRÍTICO del VPS**: la contraseña de Postgres contiene `@` crudo.
  Interpolarla en una URL rompe el parseo (asyncpg lee mal el host →
  gaierror). Por eso `DATABASE_URL` NO se arma en compose: vive en
  `services/api/.env` del VPS con la contraseña URL-encodeada (`%40`).
  Usuario real del Postgres del VPS: `meka_admin` (el local de la Mac es
  `admin_cesc` — son .env distintos).
- **Verificación de email** (Resend, misma key del portafolio, remitente
  `admin@cescjavier.dev`): token opaco de un solo uso, 24h, guardado como
  SHA-256 en `users` (determinístico a propósito: el link solo trae el
  token y hay que buscar al usuario por él con índice; seguro por los 256
  bits de entropía). `GET /auth/verify-email?token=` devuelve página HTML;
  `POST /auth/resend-verification` con respuesta genérica anti-enumeración.
  Migración 3e9a1c5b7d24. El primer correo cayó en SPAM de Gmail (remitente
  nuevo) — el usuario lo marcó como no-spam.

### Pendiente (en orden sugerido)
1. **Frontend de registro/login** en Next.js conectado a
   `api.cescjavier.dev` (el usuario ya lo pidió — siguiente paso).
2. Lemon Squeezy Live cuando aprueben la cuenta + probar checkout completo.
3. Registro DMARC en Cloudflare (mejoraría la entregabilidad del correo).
4. `VERIFY_URL_BASE` → apuntar a página del frontend cuando exista.
5. `_processed_event_ids` del webhook sigue en memoria (TODO de siempre).
6. Limpieza de repo: `services/api/venv/` está commiteado (5547 archivos).
7. Verificar/borrar el registro DNS `sentra.cescjavier.dev` que se creó por
   error (el correcto es `api`).
