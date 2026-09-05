@AGENTS.md

# Guía del repo para asistentes IA

Monorepo de Kevin Montatixe (CescJavier7): **portafolio Next.js + Sentra**, un SaaS
de seguridad web. Dos apps que se despliegan juntas en un VPS.

- **Mapa técnico completo** (árbol, infra, endpoints, modelo de datos, deploy):
  `CODEBASE_OVERVIEW.md`. Léelo primero para ubicarte.
- **Contexto de producto/negocio de Sentra:** `SENTRA_CONTEXT.md`.
- **Sentra CV AI a fondo** (prompts reales, pipeline anti-invención, esquema de salida,
  automatización lote + tracker): `SENTRA_CV_AI_CONTEXT.md`.
- **NORTE del producto** (evolución a "Job Agent": decide/aplica/aprende; calidad>volumen,
  verificable, LatAm; guardrails de cumplimiento y coste): `SENTRA_JOB_AGENT_STRATEGY.md`.
  Toda decisión de CV AI debe alinearse con esto.

---

## Estado actual (consolidado)

**En producción y funcionando** en `cescjavier.dev` (frontend) y `api.cescjavier.dev`
(backend). Sentra ya NO es "en desarrollo": es un producto usable end-to-end.

- **Portafolio (Next.js 16):** home, servicios, blog (markdown), páginas legales,
  precios, seguridad, panel admin `/meka-admin` (NextAuth+Prisma), chatbot MekaSenku (Groq).
- **Sentra (FastAPI en `services/api/`):** auth propia (Argon2id + JWT + refresh
  rotativo), **cobro manual verificado** (De Una/Banco Pichincha + QR / transferencia,
  aprobación del fundador — Lemon Squeezy y Kushki rechazaron la cuenta), targets con
  verificación DNS TXT, scanner pasivo + Security Score, historial, reportes IA (Groq),
  monitoreo continuo + alertas, descubrimiento de superficie, inteligencia de exposición,
  API pública + API keys + gate CI/CD (incl. **generación de CV por API** para automatizar
  con n8n), equipos/RBAC, webhooks salientes (HMAC), registro de auditoría, escáner público
  gratis (`/free/scan`, sin login), y motor de datos (`scan_observations`).
- **Suite todo-en-uno ($10/mes):** un plan Pro único que incluye Sentra (seguridad) +
  Sentra CV AI (empleabilidad) + Academia (aprendizaje). El navbar agrupa los SaaS en un
  dropdown "Suite"; la Academia es pestaña propia.
- **Academia (plataforma de lecciones, MVP):** lecciones en **Markdown** (como el blog) en
  `content/academia/{lang}/{track}/{NN-slug}.md` con frontmatter (title, module, order, duration,
  `access: free|pro`, description). Lector en `lib/academia.ts` (3 tracks: fullstack/ciberseguridad/
  fundamentos). Rutas: `/{lang}/academia` (landing) → `/academia/{track}` (currículo con progreso)
  → `/academia/{track}/{lesson}` (visor). **Gating:** las `free` se renderizan en SSR (SEO); las
  `pro` piden el cuerpo a `/api/academia/lesson` (autenticado, valida plan Pro vía
  `verifySentraToken`) → paywall si no. **Progreso** por usuario en Postgres (`lesson_progress`,
  `/api/v1/academy/progress`, head `e6f7a8b9c0d1`). Para añadir contenido: crear un `.md`, sin código.
- **SEO:** metadata bilingüe + hreflang + JSON-LD + sitemap dinámico + robots + blog.

---

## Reglas y gotchas CRÍTICOS (no romper)

**Verificación local:**
- Frontend: `npx tsc --noEmit -p tsconfig.json` (desde la raíz). NO usar `npm run build`
  local: falla por iCloud sincronizando `node_modules` (problema de entorno, no de código).
- Backend: `cd services/api && venv/bin/python3.12 -c "import app.main"` para chequear
  imports. El venv usa Python **de python.org**, NO Homebrew.

**Base de datos / migraciones:**
- Migraciones Alembic **a mano** (no autogenerate): encadenar `down_revision`, un solo
  head. `alembic/env.py` es async custom (el default es síncrono, rompe con asyncpg).
- `DATABASE_URL` de sentra-api vive en `services/api/.env` del VPS con la contraseña
  **URL-encodeada** (`@` → `%40`) — NO se interpola en compose (el `@` crudo rompe asyncpg).
- **Las migraciones corren SOLAS** al arrancar `sentra-api` (`entrypoint.sh` → `alembic
  upgrade head` con reintentos). Ya no hay que ejecutarlas a mano tras un cambio de modelo.
  (Head actual: `d5e6f7a8b9c0`, add captured_offers — Bandeja del agente.)

**Seguridad (es una herramienta de seguridad — mantener el estándar):**
- Anti-IDOR: toda query filtra por `organization_id` del token.
- Escaneo solo tras verificación DNS (barrera ético-legal). Excepción: `/free/scan`,
  que solo toca información pública y tiene guard anti-SSRF (`net_guard.py`).
- Mensajes anti-enumeración en auth. SHA-256 para tokens de alta entropía (indexables);
  Argon2 solo para contraseñas.
- `require_role(...)` para acciones sensibles del panel (RBAC enforced en backend).

**Cobros (MVP manual — Lemon Squeezy/Kushki rechazaron la cuenta):**
- Flujo: el cliente paga por fuera (De Una/QR de Banco Pichincha, transferencia, etc.) y
  pega la **referencia** → el **fundador** (`require_founder`, correos en `FOUNDER_EMAILS`,
  NO el OWNER de la org) la aprueba en el panel → `org.plan = PRO`, `subscription_status =
  "active_manual"`. Backend en `api/v1/manual_billing.py`, modelo `PaymentRequest`.
- Los datos de pago viven como **defaults en `core/config.py`** (`PAY_DEUNA`, `PAY_DEUNA_QR`,
  `PAY_BANK`, `PAY_CONTACT`, `PRICE_PRO="USD 10 / mes"`): NO son secretos (se le muestran al
  cliente), así que traen los datos reales por defecto y funcionan sin tocar el `.env` del
  VPS. El QR de De Una es `public/pago-deuna-qr.png` (servido por el frontend).
- El modal de compra (`UpgradeModal.tsx`) es el ÚNICO camino de upgrade (panel + precios);
  tiene tema **CyberPunk (siempre oscuro, neón cian/magenta)**. **Nada** debe volver a enrutar
  a Lemon Squeezy (`sentraCreateCheckout` quedó sin uso).
- **Política de NO reembolsos** (servicio digital de acceso inmediato) — Términos + footnote de precios.
- **Ciclo de suscripción** (`services/subscription.py`): cada pago aprobado extiende
  `organizations.plan_expires_at` +30 días (apila si renueva antes de vencer). **Cancelar**
  (`POST /billing/cancel`, OWNER/ADMIN) NO baja a FREE: mantiene Pro hasta `plan_expires_at`
  y marca `subscription_status="cancelled"` (como Netflix). `POST /billing/reactivate` deshace
  la cancelación si el período sigue vigente. **Downgrade PEREZOSO**: `GET /billing/subscription`
  baja a FREE si venció (no hay cron; futuro: barrido programado). Migración `f1a2b3c4d5e6`
  (auto-corre en el deploy vía entrypoint.sh).
- **Auto-cobro recurrente (pendiente)**: PayPhone tiene tokenización para cobrar sin re-pedir
  tarjeta, PERO requiere **autorización previa de PayPhone** + guardar el token + agendar cobros.
  Hoy la "renovación" es re-pagar. Es el siguiente paso para auto-billing real.
- **PayPhone (cobro con tarjeta AUTOMÁTICO) — VIVO y probado con dinero real.** Botón de Pago
  por redirección: `payphone_billing.py` + `payphone_service.py`, retorno en `pago/confirmar`.
  Gotchas aprendidos (todos ya resueltos en el código, NO revertir):
  · **Ruta NEUTRA `/billing/card`** (NO `/payphone`): los adblockers bloquean "payphone" en la URL.
  · **User-Agent de navegador** en `_headers()`: sin él la API (IIS/.NET) da 403 HTML (WAF).
  · **`storeId` se OMITE** (una sola tienda → PayPhone usa la default; enviarlo inválido = error 100).
  · Errores del backend en **4xx, no 5xx**: Cloudflare intercepta los 5xx y les quita el CORS.
  · Solo hace falta `PAYPHONE_TOKEN` en el `.env` del VPS (secreto, ~347 chars). `/confirm` sin
  auth de sesión a propósito (ventana de 5 min; se revierte solo si no se confirma). Aprueba por
  `transactionStatus=="Approved"`/`statusCode==3`. Contrato: docs.payphone.app/boton-de-pago-por-redireccion
  (Confirm usa `clientTxId`, montos en centavos). Cuenta de comercio a nombre de la madre de Kevin.

**Convenciones:**
- i18n: `dictionaries/{es,en}.json`, editar preservando orden (`OrderedDict`,
  `ensure_ascii=False`). Blog: mismo slug en `content/blog/es` y `/en` (para hreflang).
- LLM (Groq): Groq DECOMISIONA modelos seguido — `llama-3.1-8b-instant` (2026-08-16, reemplazo
  recomendado GPT-OSS 20B), `llama-3.3-70b-versatile` (404 `model_not_found`, ~2026-08) y
  `groq/compound` (decom. 2026-09-21). **La cuenta NO tiene Llama 3.x/4** — solo GPT-OSS
  (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`), Qwen, guard/whisper/tts. Verifica lo vivo con
  `curl api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"`. Por eso:
  · **Chatbot** (`lib/services/chat.service.ts`): CADENA con **fallback automático**
  (`GROQ_CHAT_MODELS`): `GROQ_CHAT_MODEL` (env) → `openai/gpt-oss-120b` → `openai/gpt-oss-20b`
  → `qwen/qwen3.8-27b`. Si un modelo da 404, prueba el siguiente. El `catch` devuelve `detail`
  con el error de Groq (4xx, NO 5xx: Cloudflare borra el cuerpo de los 5xx).
  · **Sentra (Python)**: `GROQ_CV_MODEL` (env, default `openai/gpt-oss-120b`). Sin fallback aún;
  si Groq lo decomisiona, se cambia en el `.env` del VPS SIN redeploy.
- El usuario **ejecuta los comandos él mismo** (git push, deploy, VPS): guiar paso a
  paso, no ejecutar por él.
- **Sensor / observabilidad** (para saber cuándo algo se rompió): health checks que sondean
  cada integración, sanitizados (ok/down + latencia; el detalle va a logs) y con **503 solo si
  algo CRÍTICO cae** (Cloudflare borra 5xx → ok/degraded devuelven 200). Sentra:
  `GET /api/v1/health` (`app/api/v1/health.py` + `services/health_service.py`: BD, Redis, Groq).
  Portafolio: `GET /api/health` (`lib/health.ts`: Prisma, Groq del chat, enlace a sentra-api).
  Tablero visual en `/{lang}/status` (`app/[lang]/status/page.tsx`, noindex). El `/health` raíz
  de FastAPI sigue siendo el liveness simple para Traefik. Apunta un uptime monitor a estos.

---

## Deploy (resumen; detalle en CODEBASE_OVERVIEW.md §8)

Push a `main` → GitHub Actions entra por SSH al VPS (`/opt/apps/portafolio`),
`git reset --hard origin/main` + rebuild. Si Actions no tiene minutos, se hace manual.
Secuencia recomendada (evita el conflicto de nombres de contenedor):
`git reset --hard origin/main && docker compose down --remove-orphans && docker compose up -d --build`.
Las **migraciones corren solas** (entrypoint). **NO usar `--force-recreate`** (deja
contenedores huérfanos → `Conflict. The container name "…" is already in use`; se limpia
con `docker compose down --remove-orphans` o `docker rm -f <nombre>`).

---

## Pendientes reales (orientados a ingresos, no a features)

1. **Cobro automático PayPhone — YA integrado; falta activar:** poner `PAYPHONE_TOKEN` en el
   `.env` del VPS (cuenta de comercio a nombre de Angela Del Pilar Caiza Caiza, madre de Kevin,
   con consentimiento) + **prueba real de $10** para verificar el contrato. De Una/QR/
   transferencia siguen como cobro manual (aprobación del fundador). Lemon Squeezy/Kushki
   DESCARTADOS (rechazaron la cuenta).
2. **Google Search Console** (enviar sitemap) — activa el SEO ya hecho.
3. **Onboarding** ✅ (checklist de activación en el overview del panel: dominio → verificar
   DNS → primer escaneo; deriva el estado de datos reales, se auto-oculta al activarse;
   `components/sentra/OnboardingChecklist.tsx`) + **panel del fundador** ✅ (métricas de negocio:
   MRR/planes/altas/pagos pendientes/actividad; `GET /api/v1/founder/metrics` founder-gated +
   `components/sentra/FounderMetrics.tsx`). Falta: **cosecha del motor de datos**
   (benchmarks "compárate con tu sector") sobre `scan_observations`.
4. Limpieza: `services/api/venv/` y `get-pip.py` commiteados — sacarlos del repo.
5. DMARC en Cloudflare (entregabilidad de correo).
