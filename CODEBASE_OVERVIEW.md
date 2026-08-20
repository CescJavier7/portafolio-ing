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

El SaaS se vende como una **suite todo-en-uno a USD 10/mes** (plan Pro único):
- **Sentra** — auditoría y monitoreo continuo de seguridad web (escaneo pasivo → Security
  Score → informes IA → alertas).
- **Sentra CV AI** — generador/adaptador de CV con IA (ATS) + automatización por API (n8n).
- **Academia** — cursos de ingeniería de software y ciberseguridad (en desarrollo).

Cobro: **tarjeta automático (PayPhone)** + manual verificado (De Una/QR/transferencia).
Suscripción mensual; cancelar mantiene acceso hasta fin de período. Ver `SENTRA_CONTEXT.md`.

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
│   │   ├── herramientas/cv/page.tsx  # Sentra CV AI (generador de CV con IA) — gancho SEO
│   │   ├── academia/page.tsx         # Academia (rediseño blueprint, consciente de sesión)
│   │   └── sentinel/             # SENTRA (producto)
│   │       ├── page.tsx          # Landing de Sentra + SEO + JSON-LD WebApplication
│   │       ├── scan/page.tsx     # Escáner PÚBLICO gratis (sin login) — gancho SEO
│   │       ├── precios/page.tsx  # Precios públicos (suite $10/mes)
│   │       ├── seguridad/page.tsx    # Postura de seguridad del propio Sentra
│   │       ├── register, login, accept-invite   # (noindex)
│   │       ├── pago/confirmar/page.tsx # Retorno de PayPhone → confirma y activa (noindex)
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
│   ├── ServicesApple, SentinelLanding, AcademyPage       # servicios + landing + Academia
│   ├── legal/LegalPage.tsx                               # plantilla términos/privacidad
│   ├── tools/                    # Sentra CV AI
│   │   ├── CVGenerator.tsx       # Herramienta principal (form + historial + carpetas)
│   │   ├── CVWizard.tsx          # Editor split-screen del CV generado (+ PDF ATS)
│   │   ├── CVAutomationPanel.tsx # API + blueprint n8n → Notion (automatización)
│   │   └── CVTour.tsx            # Tutorial interactivo
│   └── sentra/                   # UI de Sentra
│       ├── SentraLogin, SentraRegister, AcceptInvite, PublicScan, NavSession
│       ├── SentraPanel.tsx       # Shell del dashboard (sidebar + secciones + PlanCard suscripción)
│       ├── PricingPage, SecurityPage, ProAvatar, PanelCharts, ScoreTrend
│       ├── UpgradeModal.tsx      # Checkout (tema CyberPunk): PayPhone/De Una/QR/transferencia
│       ├── PayphoneConfirm.tsx   # Página de retorno de PayPhone (confirma y activa)
│       ├── FounderPayments.tsx   # Panel del fundador: aprobar/rechazar pagos manuales
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
│   │   ├── audit_log, surface_snapshot, exposure_snapshot, scan_observation,
│   │   ├── processed_webhook_event, payment_request, cv_document, cv_folder
│   ├── schemas/                  # Pydantic (request/response) — 1 por dominio (incl. billing, cv, public)
│   ├── api/v1/                   # Routers (endpoints) — ver §6
│   │   ├── auth, billing (+ cancel/reactivate), manual_billing, payphone_billing (/billing/card),
│   │   ├── cv (Sentra CV AI), targets, team, webhooks, audit,
│   │   ├── api_keys, public (API con key, incl. /cv/generate), public_free (escáner gratis), internal (cron)
│   └── services/                 # Lógica de negocio
│       ├── scanner.py            # Scanner pasivo (headers/TLS/DNS/SPF/DMARC) → score
│       ├── surface.py, exposure.py, dns_verification.py, net_guard.py (anti-SSRF)
│       ├── payphone_service.py   # PayPhone Prepare/Confirm (UA de navegador, sin storeId)
│       ├── subscription.py       # Ciclo de suscripción (next_period_end, is_expired)
│       ├── cv_service.py, cv_prompts.py  # Pipeline CV anclado por ids (anti-invención)
│       ├── ocr_service.py, pdf_service.py, file_guard.py, text_guard.py  # ingesta CV
│       ├── lemonsqueezy_service.py  # (sin uso — descartado)
│       ├── email_service.py, webhook_service.py, audit_service.py, observation_service.py
├── alembic/                      # Migraciones (env.py async custom) + versions/*.py
├── entrypoint.sh                 # Corre `alembic upgrade head` (con reintentos) y arranca uvicorn
├── alembic.ini, requirements.txt
└── Dockerfile                    # python:3.12-slim + tesseract-ocr (OCR del CV), no-root, uvicorn
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
- **PayPhone** (Ecuador) — **cobro con tarjeta AUTOMÁTICO** (Botón de Pago por redirección).
  `payphone_service.py` + `payphone_billing.py`. La ruta pública es NEUTRA (`/billing/card`,
  no `/payphone`) para que los adblockers no la bloqueen. Aprende: su API (IIS/.NET) exige
  **User-Agent de navegador** o da 403 HTML (WAF); los errores del backend deben ser 4xx
  (no 5xx) o Cloudflare les quita el CORS; el `storeId` se **omite** con una sola tienda.
  Cuenta de comercio a nombre de **Angela Del Pilar Caiza Caiza** (RUC de la madre de Kevin;
  tienda "Sentrapro"). Auto-cobro recurrente = pendiente (tokenización de PayPhone, requiere
  su autorización).
- **Cobro manual verificado** (De Una/QR Banco Pichincha, transferencia) — el fundador aprueba
  en el panel (`manual_billing.py`). Sin comisión (PayPhone cobra ~5.8%).
- **Lemon Squeezy / Kushki** — DESCARTADOS (rechazaron la cuenta). El código de Lemon Squeezy
  (`billing.py`, `lemonsqueezy_service.py`) sigue en el repo pero SIN uso.
- **Resend** — correos (`admin@cescjavier.dev`).
- **Groq** — LLM. Chatbot MekaSenku, reportes de Sentra y **Sentra CV AI** usan
  `llama-3.3-70b-versatile` (`response_format=json_object`).

---

## 5. Modelo de datos

### Base `sentra` (PostgreSQL, backend FastAPI — UUID como PK en todo)
- **organizations** — tenant. `plan` (FREE/PRO/TEAM/ENTERPRISE), `subscription_status`
  (active_*/cancelled/expired), **`plan_expires_at`** (fin del período; cancelar mantiene
  acceso hasta ahí — ver `services/subscription.py`), ids Lemon Squeezy (sin uso), contador
  anti-abuso FREE (free_scan_count + ventana 24h).
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
- **payment_requests** — cobros manuales Y PayPhone: plan, method, reference (en PayPhone
  guarda el `clientTransactionId`), status (pending/approved/rejected/expired), reviewer_email
  (`payphone-auto` cuando lo aprueba la confirmación automática).
- **cv_documents** — CVs generados por Sentra CV AI: content(JSON), profile(JSON, perfil
  normalizado con ids), match_score, job_posting, folder_id, user_id.
- **cv_folders** — carpetas para organizar los CVs del usuario.
- **job_applications** — tracker de postulaciones (Sentra CV AI): company, role, job_url,
  status (saved/applied/interview/offer/rejected), cv_document_id (opt, SET NULL), user_id.
- **search_profiles** — Job Agent (Fase 1): perfil de BÚSQUEDA por usuario (qué quiere / qué
  NO): target_role, seniority, technologies, modalities, locations, min_salary,
  max_required_experience, deal_breakers, blocked_companies… Base del Application Score.

### Base del portafolio (Prisma)
- **ChatSession**, **Message** (enum Role, SessionStatus) — chatbot MekaSenku.
- **AdminUser** — login del panel `/meka-admin` (NextAuth). Sin roles todavía.

### Migraciones (Alembic, en orden de la cadena `down_revision`; head = `f1a2b3c4d5e6`)
```
75b465a78464 init (organizations, users, refresh_tokens)
57d92ffe4b8e stripe → lemonsqueezy (rename columnas)
3e9a1c5b7d24 email verification token
7c4d2f8a1b56 marketing_consent
9f1b3c7e2a80 targets
a1c8e5d3f207 scans + scan limits
b3d9f1a4c208 user name
c4e0a2b7d319 target monitoring
d5f1a3c8e420 scan ai_report
e7a2c9f01b56 surface + exposure snapshots
f3b8d5e2a917 api keys
a8c1f4e9b203 invites + webhooks
b4d7e2f9c118 audit logs
c9e3a1f60d42 scan observations
d1a5c8b34e07 processed webhook events
e2f4b8a1c930 cv_documents
f8b2d4a6c159 cv_folders
a7c3e9f21b84 cv_profile (columna en cv_documents)
b9e4d1f7a802 payment_requests (billing manual/PayPhone)
f1a2b3c4d5e6 plan_expires_at (ciclo de suscripción)
a2b3c4d5e6f7 job_applications (tracker de postulaciones)
b3c4d5e6f7a8 search_profiles (Job Agent — perfil de búsqueda)   ← HEAD
```
Las migraciones **se aplican solas al arrancar** `sentra-api` (ver `entrypoint.sh`).

---

## 6. Endpoints del backend (todos bajo `/api/v1`)

- **auth** — register, verify-email, resend-verification, login, refresh, logout, me,
  profile (PATCH), change-password.
- **billing** — subscription (GET, con downgrade perezoso al vencer), **cancel** (mantiene
  Pro hasta `plan_expires_at`), **reactivate** (deshace cancelación). checkout/portal/webhook
  de Lemon Squeezy siguen definidos pero SIN uso.
- **billing/manual** — config (GET, métodos + QR desde `core/config.py` PAY_*), request (POST),
  mine (GET); pending/approve/reject (fundador). Cobro manual VIVO.
- **billing/card** — **PayPhone (tarjeta automático)**: prepare (POST, crea la intención y
  devuelve la URL de checkout), confirm (POST, verifica contra PayPhone y activa el plan).
  Ruta neutra a propósito (adblockers). Ver `payphone_billing.py`.
- **cv** — Sentra CV AI: generate (POST), improve, ocr, extract-pdf, apply-email, **job-meta**
  (extrae empresa+puesto para la postulación en lote), quota, folders CRUD, CVs CRUD. Pipeline
  anclado por ids (`cv_service` + `cv_prompts`) anti-invención.
- **applications** — tracker de postulaciones (user-scoped): list/create/patch/delete. Enlaza
  opcionalmente un CV. Ver `applications.py`.
- **agent** — Job Agent (Fase 1): `GET/PUT /agent/profile` (perfil de búsqueda), `POST
  /agent/evaluate` (Application Score + veredicto apply/maybe/avoid + "¿por qué NO aplicar?").
  Scoring **rules-first** (`services/application_scoring.py`); IA solo para analizar la oferta.
- **public/cv/generate** (POST) — genera/adapta un CV por **API key** (Pro+), stateless;
  motor de la automatización con n8n → Notion. Ver `public.py`.
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

**Migraciones:** el `entrypoint.sh` de `sentra-api` **corre `alembic upgrade head` solo**
al arrancar (con reintentos) — ya NO hay que ejecutarlas a mano tras un cambio de modelo.

**⚠️ Notas del deploy:**
1. Si GitHub Actions se queda **sin minutos**, el deploy se hace manual (mismos comandos, por SSH).
2. **Conflicto de nombres de contenedor** (`Conflict. The container name "/sentra-redis"…`):
   pasa si un `up` se interrumpe (los contenedores tienen `container_name` fijo). Se limpia con
   `docker compose down --remove-orphans && docker compose up -d --build`, o `docker rm -f <nombre>`.
   NO usar `--force-recreate` (es lo que deja los huérfanos).

### Manual (equivalente, cuando Actions no corre)
```bash
ssh <user>@<vps>
cd /opt/apps/portafolio
git fetch origin && git reset --hard origin/main
docker compose down --remove-orphans                   # evita conflictos de nombre
docker compose up -d --build                           # migraciones corren solas (entrypoint)
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
- **Cobro con tarjeta PayPhone: YA automático** (activación instantánea, probado con dinero
  real). Falta el **auto-cobro recurrente** (tokenización de PayPhone → guardar token + agendar
  cobros; requiere autorización previa de PayPhone). Hoy la "renovación" es re-pagar.
- **Downgrade de suscripción es PEREZOSO** (`GET /billing/subscription`), sin cron. Futuro:
  un barrido programado (o el `internal/run-monitoring`) que baje a FREE lo vencido.
- **`SENTRA_API_INTERNAL_URL`** valida tokens de Sentra desde el portafolio por red interna.
- **Un solo VPS / una sola réplica** — sin redundancia; sin monitoreo de errores (Sentry).
- **Migraciones auto-corren** (entrypoint) — OK; pero con ≥1 réplica habría carrera (Alembic
  no es concurrente-seguro): mover a un job separado si se escala.
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
