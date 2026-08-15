# CescJavier7 — Mapa completo del proyecto (para análisis de código)

> **Cómo usar este documento:** pégalo al inicio de una conversación con cualquier
> IA para que analice el código, la arquitectura, la seguridad y el despliegue de
> este proyecto sin tener que explorarlo a ciegas. Incluye el árbol, los apartados,
> la infraestructura y **cómo se sube al VPS**. Actualízalo cuando cambie la estructura.
>
> Complemento: `SENTRA_CONTEXT.md` (visión de negocio/producto de Sentra).

---

## 1. Qué es este repositorio

**Monorepo** de Kevin Javier Montatixe Caiza (CescJavier7), ingeniero de software y
ciberseguridad. Contiene **dos aplicaciones** que se despliegan juntas en un VPS:

1. **Portafolio personal + Sentra (frontend)** — App Next.js 16 (App Router) en
   `cescjavier.dev`. Es a la vez el portafolio (home, servicios, blog) y el
   **panel de Sentra** (`/[lang]/sentinel/*`). Contenedor: `portfolio-app`.
2. **API de Sentra (backend)** — FastAPI independiente en `api.cescjavier.dev`,
   bajo `services/api/`. Es el cerebro del SaaS de seguridad. Contenedor: `sentra-api`.

**Sentra** es un SaaS de auditoría y monitoreo continuo de seguridad web (escaneo
pasivo → Security Score → informes → alertas). Ver `SENTRA_CONTEXT.md` para el detalle
de producto.

---

## 2. Arquitectura de alto nivel

```
Internet
  │  (Cloudflare — DNS + TLS termination + proxy)
  ▼
Traefik (reverse proxy, red proxy-net)
  ├── cescjavier.dev / www        → portfolio-app  (Next.js :3000)
  └── api.cescjavier.dev          → sentra-api      (FastAPI :8000)

Red interna (internal-net, NO expuesta a internet):
  portfolio-app ─┬─ portfolio-db (PostgreSQL 16)   [bases: portafolio + sentra]
                 └─ sentra-api ── sentra-redis (rate limiting)
  sentra-api ─── portfolio-db (base `sentra`, separada)
```

- **Un solo VPS** (droplet DigitalOcean), todo con **Docker Compose + Traefik**.
- **Cloudflare** termina TLS; Traefik usa `tls=true` sin certresolver (lo resuelve CF).
- **PostgreSQL compartido** (`portfolio-db`): el portafolio usa una base y Sentra otra
  (`sentra`) — separadas lógicamente, mismo motor.
- Postgres y Redis **nunca** se exponen a internet (solo `internal-net`).

---

## 3. Árbol de directorios (anotado)

### Raíz (frontend Next.js)
```
.
├── app/                          # App Router (rutas)
│   ├── [lang]/                   # i18n por segmento (es | en)
│   │   ├── layout.tsx            # NavBar + Footer + Theme + metadata global + JSON-LD Person
│   │   ├── page.tsx              # HOME (portafolio) + SEO marca personal
│   │   ├── services/page.tsx     # Servicios (dev / ciberseguridad / docencia) + SEO
│   │   ├── blog/
│   │   │   ├── page.tsx          # Índice del blog (lee content/blog/{lang}/*.md)
│   │   │   └── [slug]/page.tsx   # Artículo (markdown → HTML) + SEO por post + JSON-LD
│   │   ├── legal/
│   │   │   ├── terminos/page.tsx     # Términos (componente LegalPage)
│   │   │   └── privacidad/page.tsx   # Privacidad (componente LegalPage)
│   │   └── sentinel/             # SENTRA (producto)
│   │       ├── page.tsx          # Landing de Sentra + SEO + JSON-LD WebApplication
│   │       ├── scan/page.tsx     # Escáner PÚBLICO gratis (sin login) — gancho SEO
│   │       ├── precios/page.tsx  # Precios públicos
│   │       ├── seguridad/page.tsx    # Postura de seguridad del propio Sentra
│   │       ├── register/page.tsx     # Registro (noindex)
│   │       ├── login/page.tsx        # Login (noindex)
│   │       ├── accept-invite/page.tsx # Aceptar invitación de equipo (noindex)
│   │       └── panel/page.tsx        # Panel privado (dashboard) (noindex)
│   ├── api/                      # Route Handlers (backend del propio Next.js)
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth (login del panel admin del portafolio)
│   │   ├── chat/route.ts               # Chatbot MekaSenku (usa Groq)
│   │   ├── chat/sync/route.ts          # Sincronización de sesiones de chat
│   │   ├── sentra/report/route.ts      # Genera reportes IA de Sentra (Groq) — reusa GROQ_API_KEY
│   │   └── admin/radar/route.ts        # Métricas internas del admin del portafolio
│   ├── meka-admin/               # Panel de administración del PORTAFOLIO (NextAuth+Prisma)
│   │   ├── page.tsx, layout.tsx, login/page.tsx, actions.ts
│   │   └── components/RadarDashboard.tsx
│   ├── sitemap.ts                # Sitemap dinámico (incluye blog + páginas Sentra, hreflang)
│   └── robots.ts                 # robots.txt (allow /, sitemap)
├── components/                   # Componentes React
│   ├── NavBar, Footer, ThemeProvider, SmoothScroll (Lenis), MekaSenkuChat, ...
│   ├── AboutAppleScroll, SkillsApple, ProjectApple, CertificationsApple,
│   │   WorkExperienceApple, ContactApple, AcademicBento  # secciones del home
│   ├── ServicesApple, SentinelLanding                    # servicios + landing Sentra
│   ├── legal/LegalPage.tsx                               # plantilla términos/privacidad
│   └── sentra/                   # UI de Sentra
│       ├── SentraLogin, SentraRegister, AcceptInvite, PublicScan
│       ├── SentraPanel.tsx       # Shell del dashboard (sidebar + secciones)
│       ├── PricingPage, SecurityPage, UpgradeModal, ProAvatar, PanelCharts, ScoreTrend
│       └── panel/                # Secciones del dashboard
│           ├── OverviewSection, TargetsCard→(via panel), ReportsSection, AccountSection,
│           ├── MonitorSection, SurfaceSection (+SurfaceGraph), ExposureSection,
│           ├── ApiKeysSection (+bloque Webhooks), TeamSection, AuditSection, ComingSoon
├── lib/
│   ├── auth.ts, auth.config.ts, prisma.ts   # NextAuth v5 + Prisma (admin portafolio)
│   ├── repositories/            # chatSession.repository, message.repository (Prisma)
│   ├── services/                # chat.service (Groq/MekaSenku), notification, telegram
│   ├── sentra/                  # cliente del SaaS
│   │   ├── api.ts               # Cliente HTTP de la API de Sentra (fetch + tokens)
│   │   ├── useSession.ts        # Hook de sesión reactiva (evento SENTRA_AUTH_EVENT)
│   │   ├── permissions.ts       # Helpers de rol (RBAC en el cliente)
│   │   ├── pdfReport.ts         # Exportación de informe a PDF (print-to-PDF, sin libs)
│   │   ├── domainData.ts, verifyToken.server.ts
│   ├── utils/rateLimit.ts, validation/chat.schema.ts
├── dictionaries/{es,en}.json     # i18n (todo el texto del sitio; sin next-intl)
├── content/blog/{es,en}/*.md     # Artículos del blog (markdown + frontmatter)
├── prisma/schema.prisma          # Modelos del PORTAFOLIO (ChatSession, Message, AdminUser)
├── middleware.ts                 # Protege /meka-admin y /api/admin (NextAuth JWT) + i18n
├── next.config.ts                # CSP + security headers, config Next
├── Dockerfile                    # Build multi-stage del frontend (node:20-alpine)
├── docker-compose.yml            # Orquestación de los 4 contenedores (ver §7)
├── .github/workflows/deploy.yml  # CI/CD: push a main → SSH al VPS → rebuild (ver §8)
├── CLAUDE.md                     # Instrucciones para asistentes IA en este repo
├── SENTRA_CONTEXT.md             # Contexto de producto/negocio de Sentra
└── CODEBASE_OVERVIEW.md          # (este archivo)
```

### Backend — `services/api/` (FastAPI)
```
services/api/
├── app/
│   ├── main.py                   # FastAPI app: CORS, slowapi, monta todos los routers, /health
│   ├── core/
│   │   ├── config.py             # Pydantic Settings (falla al arrancar si falta un secreto)
│   │   ├── security.py           # Argon2id, JWT, tokens opacos, hashing SHA-256, API keys
│   │   ├── plans.py              # PlanConfig por plan (FREE/PRO/TEAM/ENTERPRISE) — límites
│   │   └── rate_limit.py         # slowapi Limiter (Redis) por IP
│   ├── db/
│   │   ├── base.py, session.py   # Base declarativa + get_db (async session)
│   ├── models/                   # SQLAlchemy (async) — ver §5
│   │   ├── organization, user, refresh_token, target, scan, api_key, webhook,
│   │   ├── audit_log, surface_snapshot, exposure_snapshot,
│   │   ├── scan_observation      # motor de datos (append-only, agregado)
│   │   └── processed_webhook_event  # idempotencia persistente del webhook
│   ├── schemas/                  # Pydantic (request/response) — 1 por dominio
│   ├── api/v1/                   # Routers (endpoints) — ver §6
│   │   ├── auth, billing, targets, team, webhooks, audit,
│   │   ├── api_keys, public (API con key), public_free (escáner gratis), internal (cron)
│   └── services/                 # Lógica de negocio
│       ├── scanner.py            # Scanner pasivo (headers/TLS/DNS/SPF/DMARC) → score
│       ├── surface.py            # Descubrimiento de superficie (crt.sh, puertos, tech)
│       ├── exposure.py           # Motor determinista de rutas de exposición
│       ├── dns_verification.py   # Verificación de propiedad por DNS TXT
│       ├── lemonsqueezy_service.py  # Checkout + portal + verificación firma webhook
│       ├── email_service.py      # Resend (verificación, alertas, invitaciones)
│       ├── webhook_service.py    # Firma HMAC + entrega de webhooks salientes
│       ├── audit_service.py      # record_audit (rastro inmutable)
│       ├── observation_service.py   # record_observation (motor de datos)
│       └── net_guard.py          # Anti-SSRF (rechaza dominios que resuelven a IP interna)
├── alembic/                      # Migraciones (env.py async custom) + versions/*.py
├── alembic.ini
├── requirements.txt
└── Dockerfile                    # python:3.12-slim, usuario no-root, uvicorn --proxy-headers
```

---

## 4. Stack técnico

**Frontend (`portfolio-app`)**
- Next.js **16.2.4** (App Router, output standalone), React, TypeScript.
- i18n propio (`dictionaries/{es,en}.json` + `get-dictionary.ts`), **sin** next-intl.
- Tailwind CSS, framer-motion, Lenis (smooth scroll), lucide-react + react-icons.
- **NextAuth v5** (`^5.0.0-beta.31`) + **Prisma 5** (`@prisma/client`) + bcryptjs →
  SOLO para el panel admin del portafolio (`/meka-admin`), no para Sentra.
- react-markdown + gray-matter → blog. groq-sdk → chatbot + reportes IA. zod → validación.

**Backend (`sentra-api`)**
- **FastAPI 0.115** + **SQLAlchemy 2.0** async (driver **asyncpg**) + **Alembic** (migraciones
  a mano). Pydantic 2 / pydantic-settings.
- **passlib + argon2-cffi** (Argon2id), **python-jose** (JWT), **slowapi + redis** (rate limit).
- **dnspython** (DNS/SPF/DMARC), **requests** (crt.sh, Lemon Squeezy, Resend), cryptography.
- Uvicorn (`--proxy-headers --forwarded-allow-ips=*`).

**Servicios externos**
- **Lemon Squeezy** (Merchant of Record) — cobros. HOY en **Test Mode**.
- **Resend** — correos (`admin@cescjavier.dev`).
- **Groq** — LLM. Chatbot MekaSenku y reportes de Sentra usan `llama-3.3-70b-versatile`.

---

## 5. Modelo de datos

### Base `sentra` (PostgreSQL, backend FastAPI — UUID como PK en todo)
- **organizations** — tenant. `plan` (FREE/PRO/TEAM/ENTERPRISE), ids Lemon Squeezy,
  subscription_status, contador anti-abuso FREE (free_scan_count + ventana 24h).
- **users** — pertenece a org. `role` (OWNER/ADMIN/ANALYST/MEMBER), `email_verified`,
  tokens hasheados (verificación email + invite), bloqueo por intentos, marketing_consent.
- **refresh_tokens** — opacos, hasheados (Argon2), `family_id` (rotación + detección de reuso).
- **targets** — dominio a auditar, `verified` (DNS TXT), `monitoring_enabled`.
- **scans** — score/grade/findings(JSON)/ai_report(JSON) por escaneo. Historial + tendencia.
- **surface_snapshots** / **exposure_snapshots** — resultados de superficie / exposición.
- **api_keys** — org-scoped, hash SHA-256, prefijo en claro.
- **webhooks** — url + secret (texto plano, para firmar) + event_types.
- **audit_logs** — inmutable, actor_email denormalizado, action + target + meta.
- **scan_observations** — MOTOR DE DATOS: append-only, dominio **hasheado**, score,
  controles fallidos, source (panel/monitor/free). Anónimo, para inteligencia agregada.
- **processed_webhook_events** — idempotencia persistente del webhook (event_key único).

### Base del portafolio (Prisma)
- **ChatSession**, **Message** (enum Role, SessionStatus) — chatbot MekaSenku.
- **AdminUser** — login del panel `/meka-admin` (NextAuth). Sin roles todavía.

### Migraciones (Alembic, orden cronológico; head actual = `d1a5c8b34e07`)
```
75b465a78464 init (organizations, users, refresh_tokens)
3e9a1c5b7d24 email verification token
7c4d2f8a1b56 marketing_consent
b3d9f1a4c208 user name
57d92ffe4b8e stripe → lemonsqueezy (rename columnas)
9f1b3c7e2a80 targets
c4e0a2b7d319 target monitoring
a1c8e5d3f207 scans + scan limits
d5f1a3c8e420 scan ai_report
e7a2c9f01b56 surface + exposure snapshots
f3b8d5e2a917 api keys
a8c1f4e9b203 invites + webhooks
b4d7e2f9c118 audit logs
c9e3a1f60d42 scan observations
d1a5c8b34e07 processed webhook events   ← HEAD
```

---

## 6. Endpoints del backend (todos bajo `/api/v1`)

- **auth** — register, verify-email, resend-verification, login, refresh, logout, me,
  profile (PATCH), change-password.
- **billing** — subscription (GET), checkout-session (POST), portal (GET),
  webhook (POST, firma HMAC + idempotencia persistente).
- **targets** — CRUD dominios, instructions, verify (DNS TXT), scan, scans (historial),
  scans/{id}/report (PUT), discover (superficie), exposure, monitoring (PATCH).
  → acciones sensibles gateadas con `require_role`.
- **team** — list, invite, accept-invite (público), {id}/role (PATCH, solo OWNER), remove.
- **webhooks** — CRUD + regenerate-secret + toggle.
- **api-keys** — list, create, revoke (OWNER/ADMIN).
- **audit** — list (solo OWNER/ADMIN), paginado + filtro.
- **public** — API con API key (score / findings / gate para CI/CD), aislada por org.
- **free/scan** — **escáner PÚBLICO sin auth** (solo info pública, anti-SSRF, rate limit).
- **internal/run-monitoring** — cron del VPS (secreto compartido) re-escanea y alerta.

Reglas transversales: aislamiento anti-IDOR (filtrar por `organization_id` del token),
rate limiting por endpoint, mensajes anti-enumeración en auth, escáner solo tras
verificación DNS (barrera ético-legal) — excepto el escáner público, que solo toca
información pública.

---

## 7. Infraestructura — `docker-compose.yml`

Cuatro servicios:
1. **portfolio-app** (build `.`) — Next.js :3000. Traefik Host `cescjavier.dev` / `www`.
   Redes: `proxy-net` (Traefik) + `internal-net` (Postgres). Recibe `DATABASE_URL`
   (interpolada), `NODE_ENV=production`, `SENTRA_API_INTERNAL_URL=http://sentra-api:8000`.
2. **portfolio-db** (postgres:16-alpine) — solo `internal-net`. Expuesto SOLO a
   `127.0.0.1:5432` del host (para acceso puntual del dev). Volumen `postgres-data`.
3. **sentra-redis** (redis:alpine) — solo `internal-net`, rate limiting de la API.
4. **sentra-api** (build `./services/api`) — FastAPI :8000. Traefik Host
   `api.cescjavier.dev` + middleware ratelimit. Redes: `proxy-net` + `internal-net`.
   `env_file: services/api/.env` (secretos), `REDIS_URL`, `ENVIRONMENT=production`.

**GOTCHA CRÍTICO:** `DATABASE_URL` de sentra-api **NO** se arma por interpolación en
compose. La contraseña de Postgres del VPS contiene `@`, que rompe el parseo de la URL
(asyncpg lee mal el host → gaierror). Por eso vive **en `services/api/.env` del VPS**,
con la contraseña **URL-encodeada** (`@` → `%40`). Usuario Postgres del VPS: `meka_admin`.

Endurecimiento: `no-new-privileges`, usuarios no-root en ambos Dockerfile, `restart`
policies, Postgres sin `proxy-net`.

---

## 8. Cómo se sube al VPS (despliegue)

### Automático (GitHub Actions → SSH) — `.github/workflows/deploy.yml`
En cada **push a `main`**, `appleboy/ssh-action` entra al VPS y ejecuta:
```bash
cd /opt/apps/portafolio
git fetch --all
git reset --hard origin/main      # --hard solo toca archivos rastreados; los .env quedan intactos
docker compose up -d --build --force-recreate portfolio-app sentra-api sentra-redis
docker image prune -f
```
Filosofía: `up --build --force-recreate` (NO `down`) → si el build falla, el
contenedor viejo sigue sirviendo tráfico. Secrets de Actions: `SSH_HOST`, `SSH_USER`, `SSH_KEY`.

**⚠️ Dos cosas que el workflow NO hace:**
1. **NO corre migraciones de Alembic.** Tras un deploy con cambios de modelo hay que
   ejecutar a mano: `docker compose exec sentra-api alembic upgrade head`.
2. Si GitHub Actions se queda **sin minutos**, el workflow no corre y el deploy se
   hace manual (mismos comandos, por SSH).

### Manual (equivalente, cuando Actions no corre)
```bash
ssh <user>@<vps>
cd /opt/apps/portafolio
git fetch origin && git reset --hard origin/main
docker compose build sentra-api portfolio-app          # solo los que cambiaron
docker compose up -d --force-recreate sentra-api portfolio-app
docker compose exec sentra-api alembic upgrade head    # si hubo migración
docker compose logs -f sentra-api --tail=40
```
- Cambios **solo frontend** → basta `portfolio-app`.
- Cambios **backend** → `sentra-api` (+ migración si aplica).
- Secretos (`.env` raíz y `services/api/.env`) viven SOLO en el VPS, nunca en git.

---

## 9. Seguridad (postura del propio proyecto)

- Contraseñas Argon2id; JWT de 15 min + refresh rotativo con detección de reuso.
- Rate limiting en dos capas (slowapi+Redis en la app, middleware en Traefik).
- HTTPS forzado, CSP + security headers (`next.config.ts`), HSTS, X-Frame-Options.
- Contenedores aislados, usuarios no-root, Postgres/Redis fuera de internet.
- Anti-enumeración en auth, anti-IDOR (queries por organization_id), verificación DNS
  antes de escanear, **guard anti-SSRF** en el escáner público.
- SHA-256 (indexable) para tokens de alta entropía; Argon2 solo para contraseñas.
- `middleware.ts` protege `/meka-admin` y `/api/admin` (antes NO se verificaba sesión ahí).

---

## 10. Deuda técnica / puntos a revisar (para el análisis)

- **`services/api/venv/` commiteado** al repo (miles de archivos) — pendiente limpiar
  (agregar a `.gitignore` + `git rm -r --cached`).
- **`services/api/get-pip.py`** commiteado (artefacto de instalación) — puede borrarse.
- **Lemon Squeezy en Test Mode** — cobros reales pendientes de aprobación de la cuenta.
- **Deploy no corre migraciones** — riesgo de olvido; candidato a automatizar en el
  arranque del contenedor (entrypoint `alembic upgrade head`).
- **`SENTRA_API_INTERNAL_URL`** valida tokens de Sentra desde el portafolio por red interna.
- **Un solo VPS / una sola réplica** — sin redundancia; sin monitoreo de errores (Sentry).
- **`_processed_event_ids` en memoria** — YA resuelto (tabla `processed_webhook_events`).
- **Reportes IA vía ruta Next.js** (`app/api/sentra/report`), no desde FastAPI — reusa
  `GROQ_API_KEY` del portafolio; el backend Python no llama al LLM.
- **DMARC** de `cescjavier.dev` pendiente en Cloudflare (entregabilidad de correo).

---

## 11. Convenciones y gotchas de desarrollo

- **Verificación local del frontend:** `npx tsc --noEmit -p tsconfig.json` (NO `npm run
  build`, que falla localmente por iCloud sincronizando `node_modules` — es un problema
  de entorno, no de código).
- **Verificación local del backend:** venv creado con Python **de python.org**
  (`/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12`), NO Homebrew
  (hubo un bug de `pyexpat`). `venv/bin/python3.12 -c "import app.main"` para chequear imports.
- **Migraciones a mano** (no autogenerate): `down_revision` encadenado; `alembic/env.py`
  es una versión async custom (el default de `alembic init` es síncrono, incompatible
  con asyncpg). Un solo head siempre.
- **i18n:** editar `dictionaries/{es,en}.json` preservando orden (scripts con
  `OrderedDict` + `ensure_ascii=False`). Blog: mismo slug en `content/blog/es` y `/en`.
- **AGENTS.md** advierte: este Next.js tiene breaking changes vs training data; leer
  `node_modules/next/dist/docs/` antes de asumir APIs.
