@AGENTS.md

# Guía del repo para asistentes IA

Monorepo de Kevin Montatixe (CescJavier7): **portafolio Next.js + Sentra**, un SaaS
de seguridad web. Dos apps que se despliegan juntas en un VPS.

- **Mapa técnico completo** (árbol, infra, endpoints, modelo de datos, deploy):
  `CODEBASE_OVERVIEW.md`. Léelo primero para ubicarte.
- **Contexto de producto/negocio de Sentra:** `SENTRA_CONTEXT.md`.

---

## Estado actual (consolidado)

**En producción y funcionando** en `cescjavier.dev` (frontend) y `api.cescjavier.dev`
(backend). Sentra ya NO es "en desarrollo": es un producto usable end-to-end.

- **Portafolio (Next.js 16):** home, servicios, blog (markdown), páginas legales,
  precios, seguridad, panel admin `/meka-admin` (NextAuth+Prisma), chatbot MekaSenku (Groq).
- **Sentra (FastAPI en `services/api/`):** auth propia (Argon2id + JWT + refresh
  rotativo), billing Lemon Squeezy (Test Mode), targets con verificación DNS TXT,
  scanner pasivo + Security Score, historial, reportes IA (Groq), monitoreo continuo +
  alertas, descubrimiento de superficie, inteligencia de exposición, API pública +
  API keys + gate CI/CD, equipos/RBAC, webhooks salientes (HMAC), registro de auditoría,
  escáner público gratis (`/free/scan`, sin login), y motor de datos (`scan_observations`).
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
- **El deploy NO corre migraciones.** Tras cambios de modelo, ejecutar a mano en el VPS:
  `docker compose exec sentra-api alembic upgrade head`.

**Seguridad (es una herramienta de seguridad — mantener el estándar):**
- Anti-IDOR: toda query filtra por `organization_id` del token.
- Escaneo solo tras verificación DNS (barrera ético-legal). Excepción: `/free/scan`,
  que solo toca información pública y tiene guard anti-SSRF (`net_guard.py`).
- Mensajes anti-enumeración en auth. SHA-256 para tokens de alta entropía (indexables);
  Argon2 solo para contraseñas.
- `require_role(...)` para acciones sensibles del panel (RBAC enforced en backend).

**Convenciones:**
- i18n: `dictionaries/{es,en}.json`, editar preservando orden (`OrderedDict`,
  `ensure_ascii=False`). Blog: mismo slug en `content/blog/es` y `/en` (para hreflang).
- LLM (Groq): chat y reportes usan `llama-3.3-70b-versatile` (el `llama-3.1-8b-instant`
  se decomisionó el 2026-08-16).
- El usuario **ejecuta los comandos él mismo** (git push, deploy, VPS): guiar paso a
  paso, no ejecutar por él.

---

## Deploy (resumen; detalle en CODEBASE_OVERVIEW.md §8)

Push a `main` → GitHub Actions entra por SSH al VPS (`/opt/apps/portafolio`),
`git reset --hard origin/main` + `docker compose up -d --build --force-recreate`.
Si Actions no tiene minutos, se hace manual (mismos comandos). Reconstruir solo el
servicio que cambió: `portfolio-app` (frontend) y/o `sentra-api` (backend, + migración).

---

## Pendientes reales (orientados a ingresos, no a features)

1. **Lemon Squeezy Live** (esperar aprobación de la cuenta) — bloqueador #1, no-código.
2. **Google Search Console** (enviar sitemap) — activa el SEO ya hecho.
3. **Onboarding** pulido + **panel del fundador** (métricas) + **cosecha del motor de
   datos** (benchmarks "compárate con tu sector").
4. Limpieza: `services/api/venv/` y `get-pip.py` commiteados — sacarlos del repo.
5. DMARC en Cloudflare (entregabilidad de correo).
