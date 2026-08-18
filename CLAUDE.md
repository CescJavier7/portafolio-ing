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

**Cobros (MVP manual — Lemon Squeezy/Kushki rechazaron la cuenta):**
- Flujo: el cliente paga por fuera (De Una/QR de Banco Pichincha, transferencia, etc.) y
  pega la **referencia** → el **fundador** (`require_founder`, correos en `FOUNDER_EMAILS`,
  NO el OWNER de la org) la aprueba en el panel → `org.plan = PRO`, `subscription_status =
  "active_manual"`. Backend en `api/v1/manual_billing.py`, modelo `PaymentRequest`.
- Los datos de pago viven como **defaults en `core/config.py`** (`PAY_DEUNA`, `PAY_DEUNA_QR`,
  `PAY_BANK`, `PAY_CONTACT`, `PRICE_PRO="USD 10 / mes"`): NO son secretos (se le muestran al
  cliente), así que traen los datos reales por defecto y funcionan sin tocar el `.env` del
  VPS. El QR de De Una es `public/pago-deuna-qr.png` (servido por el frontend).
- El modal de compra (`UpgradeModal.tsx`) es el ÚNICO camino de upgrade (panel + precios).
  **Nada** debe volver a enrutar a Lemon Squeezy (`sentraCreateCheckout` quedó sin uso).
- **PayPhone (cobro con tarjeta AUTOMÁTICO) YA integrado** — Botón de Pago por redirección:
  `payphone_billing.py` (`/billing/payphone/prepare` + `/confirm`), `payphone_service.py`,
  página de retorno `app/[lang]/sentinel/pago/confirmar`. Config en `core/config.py`
  (`PAYPHONE_TOKEN` = SECRETO → `.env` del VPS; `PAYPHONE_STORE_ID` = el "Identificador" de
  la app; `PAYPHONE_RESPONSE_URL` debe coincidir con la registrada en PayPhone). El `/confirm`
  NO lleva auth de sesión a propósito (ventana de 5 min de PayPhone; se revierte solo si no se
  confirma). Activa `org.subscription_status="active_payphone"`. Contrato oficial:
  docs.payphone.app/boton-de-pago-por-redireccion (Confirm usa `clientTxId`, montos en centavos).
  ⚠️ Si `PAYPHONE_STORE_ID` (Identificador) diera error en Prepare, probar con el "Id Cliente".

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

1. **Cobro automático PayPhone — YA integrado; falta activar:** poner `PAYPHONE_TOKEN` en el
   `.env` del VPS (cuenta de comercio a nombre de Angela Del Pilar Caiza Caiza, madre de Kevin,
   con consentimiento) + **prueba real de $10** para verificar el contrato. De Una/QR/
   transferencia siguen como cobro manual (aprobación del fundador). Lemon Squeezy/Kushki
   DESCARTADOS (rechazaron la cuenta).
2. **Google Search Console** (enviar sitemap) — activa el SEO ya hecho.
3. **Onboarding** pulido + **panel del fundador** (métricas) + **cosecha del motor de
   datos** (benchmarks "compárate con tu sector").
4. Limpieza: `services/api/venv/` y `get-pip.py` commiteados — sacarlos del repo.
5. DMARC en Cloudflare (entregabilidad de correo).
