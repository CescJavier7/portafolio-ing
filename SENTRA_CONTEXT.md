# Sentra — Contexto completo del proyecto

> **Cómo usar este documento:** pégalo al inicio de una conversación con cualquier
> IA (ChatGPT, Claude, Gemini, etc.) para que entienda Sentra de cero sin que tengas
> que re-explicar. Está pensado como un "briefing" reutilizable. Actualízalo cuando
> el proyecto cambie de fase.

---

## 1. Qué es Sentra (en una frase)

Sentra es un **SaaS de auditoría y monitoreo continuo de seguridad del perímetro
digital**: le das un dominio, verificas que es tuyo por DNS, y Sentra lo escanea de
forma **pasiva** (sin atacarlo), le pone un **Security Score (0–100, nota A–F)**,
genera un **informe formal mapeado a estándares (OWASP / CWE / NIST / RFC)**, vigila
el dominio en el tiempo y te **alerta cuando la postura empeora**.

Público objetivo: desarrolladores, equipos pequeños, agencias y consultoras que
necesitan una postura de seguridad "siempre encendida" sin la complejidad ni el
precio de las suites enterprise.

Autor: **Kevin Javier Montatixe Caiza** (CescJavier7) — Ingeniero de Software y
Ciberseguridad, Ecuador. Sentra vive dentro de su portafolio (cescjavier.dev) como
proyecto insignia y potencial startup.

---

## 2. Propuesta de valor / diferenciadores

- **Pasivo y ético por diseño:** no explota vulnerabilidades; solo observa lo que ya
  es público (headers, TLS, DNS, Certificate Transparency). Barrera ético-legal:
  **no se escanea un dominio hasta verificar su propiedad por registro DNS TXT.**
- **Score accionable, no un PDF muerto:** cada hallazgo trae severidad, recomendación
  y referencia a un estándar (OWASP/CWE/NIST). Reportes con IA en 3 capas: ejecutivo
  de negocio, prioridades, y técnico.
- **Inteligencia de exposición:** motor **determinista basado en reglas** (NO IA
  inventada) que correlaciona hallazgos + superficie en "rutas de exposición" tipo
  attack-path (puertos de DB expuestos, subdominio sensible sin CSP, etc.).
- **Es infraestructura, no solo una app:** API pública + API keys, endpoint `/gate`
  para CI/CD (falla el pipeline si el score baja de un umbral), y webhooks salientes
  firmados con HMAC.
- **Seguro sobre sí mismo:** al ser una herramienta de seguridad, su propia postura
  está endurecida (ver sección 7). Eso es parte del pitch.

---

## 3. Estado actual (fase)

**Fase: MVP técnicamente completo → pre-lanzamiento.**
El producto tiene MÁS features que muchos SaaS que ya cobran. El riesgo de producto
es bajo; el riesgo de **go-to-market (lanzar + conseguir usuarios + cobrar)** es el
que domina ahora.

- Auth + billing + producto completo, **funcionando en producción** en `cescjavier.dev`.
- Billing validado end-to-end **en Test Mode** de Lemon Squeezy (aún no cobra dinero real).
- **0 usuarios reales de pago.** Una publicación de LinkedIn hecha como primer alcance.

---

## 4. Arquitectura y stack

**Monorepo** con dos servicios:

1. **Frontend / portafolio** — Next.js (App Router, v16), i18n propio ES/EN
   (`dictionaries/{es,en}.json`, sin next-intl), Tailwind, framer-motion. Contenedor
   `portfolio-app`. El panel de Sentra vive en `/[lang]/sentinel/panel`.
2. **Backend / API de Sentra** — `services/api/`, **FastAPI** independiente en
   `api.cescjavier.dev`. SQLAlchemy async (driver asyncpg), Alembic (migraciones
   escritas a mano), Pydantic Settings (falla al arrancar si falta un secreto).

**Infra:** un solo VPS (droplet DigitalOcean), **Docker Compose + Traefik**,
**Cloudflare** termina TLS. Postgres compartido (`portfolio-db`) con una base
`sentra` separada. **Redis** (`sentra-redis`) para rate limiting. Deploy manual por
SSH (`git reset --hard origin/main` + `docker compose up -d --build`) porque las
GitHub Actions están sin minutos.

**Servicios externos:**
- **Lemon Squeezy** — cobros (Merchant of Record: vende como individuo sin RUC).
- **Resend** — correos (verificación, alertas, invitaciones). Remitente `admin@cescjavier.dev`.
- **Groq** (`llama-3.3-70b-versatile`) — genera los reportes con IA, vía una ruta del
  propio Next.js (no expone la key al cliente).

---

## 5. Modelo de datos (núcleo)

- **Organization** — tenant. Tiene `plan` (FREE/PRO/TEAM/ENTERPRISE) e IDs de Lemon
  Squeezy. El plan vive AQUÍ, no en el usuario.
- **User** — pertenece a una Organization. Campo `role`: **OWNER > ADMIN > ANALYST >
  MEMBER** (RBAC). Argon2id para contraseñas.
- **RefreshToken** — opaco, hasheado, con rotación + detección de reuso (familia).
- **Target** — dominio a auditar. Verificación por DNS TXT antes de escanear.
- **Scan** — score/grade/findings/ai_report por escaneo (historial + tendencia).
- **SurfaceSnapshot** — subdominios/puertos/tecnologías descubiertos.
- **ExposureSnapshot** — rutas de exposición calculadas.
- **ApiKey** — org-scoped, hash SHA-256, prefijo en claro para identificar.
- **Webhook** — URL + secret (en claro, se necesita para firmar) + tipos de evento.
- **AuditLog** — registro inmutable de acciones sensibles (quién hizo qué y cuándo).

---

## 6. Features construidas (todas funcionando)

1. **Auth** — registro, verificación de email, login, refresh rotativo, logout,
   cambio de contraseña (revoca otras sesiones), bloqueo tras 5 intentos, mensajes
   anti-enumeración.
2. **Billing** — checkout hosteado de Lemon Squeezy, webhook con firma HMAC +
   idempotencia, portal de cliente, gates por plan.
3. **Targets** — alta de dominios, verificación DNS TXT, límite por plan.
4. **Scanner pasivo** — headers de seguridad, TLS/certificado, SPF/DMARC → Security
   Score ponderado (0–100), nota A–F, cada hallazgo con referencia OWASP/CWE/NIST/RFC.
5. **Historial + tendencia** — escaneos persistidos, gráfica de evolución del score.
6. **Reportes con IA** — 3 capas (ejecutivo/prioridades/técnico) + exportación a PDF
   formal (banner de clasificación, metodología, referencias, disclaimer).
7. **Monitoreo continuo** — cron re-escanea dominios vigilados, compara con el
   anterior, y manda **alerta por correo** si hay regresión (baja de score, nuevo
   control fallido, peor nota).
8. **Descubrimiento de superficie** — subdominios (Certificate Transparency / crt.sh),
   puertos comunes, tecnologías (fingerprint por headers) + **grafo interactivo**.
9. **Inteligencia de exposición** — motor determinista de rutas de riesgo.
10. **API pública + API keys** — consulta de score/findings/gate desde otros sistemas;
    aislada por organización.
11. **Integración CI/CD** — script `sentra-gate.sh` + ejemplo de GitHub Actions.
12. **Equipos + RBAC** — invitaciones por correo, roles con permisos reales
    (enforced en backend con `require_role` y reflejado en la UI).
13. **Webhooks salientes** — eventos `scan_completed`, `monitoring_alert`,
    `exposure_alert`, cada entrega firmada con HMAC-SHA256 (`X-Sentra-Signature`).
14. **Registro de auditoría** — trazabilidad inmutable, visible solo para OWNER/ADMIN.

---

## 7. Postura de seguridad del propio Sentra

(Esto es parte del pitch: "una herramienta de seguridad debe estar asegurada".)

- Contraseñas con **Argon2id**; tokens de acceso JWT de 15 min + **refresh rotativo
  con detección de reuso** (revoca toda la familia si se detecta robo).
- **Rate limiting** en dos capas: app (slowapi+Redis) y proxy (Traefik).
- **HTTPS** forzado, **headers de seguridad + CSP**, HSTS, X-Frame-Options.
- **Contenedores aislados**, usuario no-root, Postgres sin exponer a internet.
- **Secretos fuera de git** (archivos `.env` solo en el VPS).
- **Anti-enumeración** en auth, **protección anti-IDOR** (todas las queries filtran
  por `organization_id` del token), **barrera de verificación DNS** antes de escanear.
- Hashing SHA-256 (indexable) para tokens de alta entropía (verificación de email,
  API keys, invites); Argon2 solo para contraseñas.

---

## 8. Modelo de negocio y planes

Freemium con Merchant of Record (Lemon Squeezy emite factura y maneja impuestos).

| Plan | Precio | Dominios | Escaneos | Extras |
|------|--------|----------|----------|--------|
| FREE | $0 | 3 | 3 / 24h | score básico |
| PRO | $30/mes | 10 | ilimitados | IA, API, 1 webhook, 3 miembros |
| TEAM | (por definir) | 50 | ilimitados | +webhooks, 10 miembros |
| ENTERPRISE | (por definir) | 1000 | ilimitados | 50 miembros |

---

## 9. Qué falta para generar ingresos (bloqueadores reales)

En orden de impacto sobre "ganancias":

1. **Cobros reales (BLOQUEADOR #1):** Lemon Squeezy sigue en Test Mode. Hasta que
   aprueben la cuenta y se pongan las keys Live, literalmente no entra dinero.
2. **Confianza para vender:** falta página pública de **precios**, y páginas
   **legales** (Términos, Privacidad) + una de **Seguridad**. En una herramienta de
   seguridad, las páginas de confianza pesan más que en un SaaS normal.
3. **Distribución / primeros usuarios:** 0 usuarios. Falta un canal de adquisición
   repetible (contenido técnico, Product Hunt, comunidades de devs/seguridad, etc.).
4. **Activación / onboarding:** una primera experiencia que lleve al usuario nuevo al
   "aha" (primer escaneo + score) en menos de 2 minutos.
5. **Fiabilidad operativa (antes de escalar):** idempotencia del webhook de billing
   está en memoria (riesgo de doble cobro si reinicia); un solo VPS sin redundancia;
   sin monitoreo de errores (tipo Sentry); sin página de estado; verificar backups.
6. **Métricas de negocio:** no hay panel interno del fundador (altas, conversiones, MRR).

**El cuello de botella NO es más features — es lanzar, cobrar y conseguir usuarios.**

---

## 10. Deuda técnica conocida (TODOs reales en el código)

- `_processed_event_ids` del webhook de Lemon Squeezy vive en memoria (billing.py).
- `services/api/venv/` está commiteado al repo (miles de archivos) — limpiar.
- Falta registro **DMARC** en Cloudflare (mejora entregabilidad del correo).
- Lemon Squeezy Live pendiente de aprobación de la cuenta.
- Supuestos de una sola réplica (idempotencia, rate limit en memoria de slowapi).

---

## 11. Roadmap sugerido (orientado a ingresos, no a features)

1. **Lemon Squeezy Live** cuando aprueben → desbloquea el dinero.
2. **Página de precios + legales + seguridad** → desbloquea confianza/venta.
3. **Onboarding pulido + 1 canal de adquisición** → desbloquea usuarios.
4. **Endurecimiento operativo** (idempotencia en Postgres, monitoreo de errores,
   backups verificados) → antes de escalar.
5. Luego sí, features de retención: escaneos programados configurables, integración
   con Slack, más scanners.
