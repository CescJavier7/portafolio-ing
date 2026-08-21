# Sentra CV AI — Contexto completo de la herramienta

> **Cómo usar este documento:** pégalo al inicio de una conversación con cualquier IA
> (ChatGPT, Claude, Gemini…) para que entienda a fondo cómo funciona el generador de CV
> de Sentra: su arquitectura anti-invención, **los prompts reales**, cómo sale el CV, y el
> **apartado automatizado** (postular en lote + tracker, sin tocar código). Reutilizable.
>
> Complementos: `SENTRA_CONTEXT.md` (negocio) · `CODEBASE_OVERVIEW.md` (mapa técnico).

---

## 1. Qué es Sentra CV AI

Herramienta de **empleabilidad con IA** dentro de la suite Sentra ($10/mes, todo incluido).
El usuario pega su perfil/CV + la descripción de una vacante, y la IA le devuelve un **CV
adaptado a esa oferta**: reformulado para pasar filtros **ATS**, con un **match score**
(0–100), los **requisitos que le faltan** y **sugerencias accionables**. Editable en un
editor split-screen y exportable a **PDF con formato ATS**.

Ruta pública (gancho SEO, sin login para ver; requiere cuenta para generar):
`cescjavier.dev/[lang]/herramientas/cv`. Backend: `services/api/app/api/v1/cv.py`.

**Diferenciador central:** no "alucina". El modelo NO redacta el CV desde cero — solo
**selecciona y reformula logros que existen** en el historial del usuario (arquitectura
anclada por identificadores, §3). Es imposible que invente empresas, fechas, teléfonos o
cifras que el usuario no puso.

**Modelo LLM:** Groq `llama-3.3-70b-versatile`, siempre con `response_format=json_object`
(salida JSON forzada). Config: `GROQ_CV_MODEL` en `core/config.py`.

**Evolución (2026): de generador de CV a JOB AGENT.** Ya no solo adapta CVs: **decide** a qué
ofertas aplicar (Application Score + Firewall anti-estafa), **prepara** la aplicación (CV desde tu
perfil guardado + registro) y **aprende** de tu embudo (diagnóstico) — con una **extensión de
navegador** que trae las ofertas desde cualquier web. Todo en el nuevo **§7 "El Job Agent"**.
Norte estratégico: `SENTRA_JOB_AGENT_STRATEGY.md`.

---

## 2. Recorrido del usuario (UX)

1. **Ingresa el perfil** — pega texto, o sube una **foto** (OCR con Tesseract) o un **PDF**
   (extracción de texto). Un `text_guard` detecta texto ilegible (PDFs de Canva sin espacios)
   y avisa ANTES de gastar tokens.
2. **Pega la oferta** — texto o foto (OCR).
3. **Genera** — la IA corre el pipeline de 4 fases (§3) y devuelve el CV adaptado + match
   score + faltantes + sugerencias.
4. **Edita** — editor split-screen (`CVWizard`): corrige campos, arrastra, ajusta. Botón
   **"Mejorar con IA"** reescribe para subir el match (consume 1 crédito).
5. **Exporta** — **PDF ATS** (print-to-PDF, sin librerías pesadas) o **correo de postulación**
   redactado por la IA (`apply-email`).
6. **Organiza** — carpetas (`cv_folders`) para agrupar CVs por área.
7. **Automatiza** — pestaña **Postulaciones**: postula en lote y lleva el registro (§6, §7).

Freemium: plan FREE = 3 CVs/semana (`cv_per_week`); PRO/TEAM = ilimitado. El límite se
aplica en `_enforce_cv_quota` (lanza HTTP 402 al agotarse).

---

## 3. El pipeline anti-invención (anclado por identificadores)

Es la pieza clave. En vez de pedirle al modelo "escribe un CV", el sistema:

1. **Normaliza el perfil** dándole un **id a cada logro**.
2. Le pasa al modelo SOLO los logros con sus ids (sin datos personales).
3. El modelo devuelve **una lista de ids + el texto reformulado** de cada logro.
4. El backend **reconstruye el CV desde el perfil**, no desde la respuesta del modelo:
   los ids que no existen se descartan; nombre/contacto/empresas/fechas se copian del perfil.

> Consecuencia: los datos personales **nunca pasan por el LLM** en la fase de adaptación →
> no puede inventar residencia ni teléfono. Un logro inexistente no tiene id válido → se
> descarta solo. "No depende de que el modelo obedezca, sino de que el backend solo acepte
> lo que puede verificar." (`services/cv_prompts.py`)

Las 4 fases:

```
profile_text ──► FASE 1: extract_profile ──► perfil normalizado con ids (se guarda)
job_posting  ──► FASE 2: analyze_offer   ──► requisitos + keywords ATS
(perfil + análisis) ─► FASE 3: adapt_cv  ──► {bullets:[{id,texto}], titular, resumen, …}
(perfil + salida)   ─► FASE 4: rebuild_cv ─► CV final VERIFICADO (ids validados)
                                    └─► detectar_datos_no_rastreables (marca cifras nuevas)
```

Fases 1 y 2 son independientes → corren **en paralelo** (`asyncio.gather`), con timeouts
(65s + 45s) para responder antes del corte de ~100s de Cloudflare. Modelo por fase con
`temperature` baja (0.1 transcribe, 0.3 adapta) para reducir creatividad indebida.

---

## 4. Los prompts reales

> Verbatim de `services/api/app/services/cv_prompts.py`. Son la "IA" que construye los CVs.

### FASE 1 — `EXTRACT_SYSTEM_PROMPT` (normaliza el perfil a estructura con ids)

```
Recibes el perfil profesional de una persona (texto plano, posiblemente extraído por OCR y
con errores de reconocimiento). Devuelves ÚNICAMENTE un objeto JSON válido, sin markdown,
sin bloques de código, sin explicaciones.

Esquema exacto:
{
  "datos_personales": {
    "nombre": "", "titular": "", "ubicacion": "", "email": "",
    "telefono": "", "web": "", "linkedin": ""
  },
  "experiencia": [
    { "id": "exp_1", "cargo": "", "empresa": "", "ubicacion": "",
      "inicio": "", "fin": "", "prioridad": 1,
      "bullets": [ { "id": "b1", "tags": [], "texto": "" } ] }
  ],
  "educacion": [ { "titulo": "", "institucion": "", "inicio": "", "fin": "" } ],
  "certificaciones": [ { "nombre": "", "entidad": "", "anio": "", "tags": [] } ],
  "idiomas": [ { "idioma": "", "nivel": "" } ],
  "habilidades": { "Categoría": ["item"] }
}

REGLAS
1. Transcribe. No mejores, no completes, no deduzcas. Si un dato no aparece en el texto, el
   campo queda como cadena vacía.
2. PROHIBIDO inventar datos personales. Si no hay teléfono, ubicación, correo o LinkedIn en
   el texto, esos campos van vacíos. Nunca infieras una ciudad a partir de un nombre de
   empresa ni un correo a partir de un nombre.
   La cabecera del contacto suele venir en UNA sola línea separada por "|" o "·" (ej.
   "Machachi, Quito, Ecuador | correo@dominio.com | +593 98 375 5469 | www.sitio.dev").
   Separa cada dato en su campo: "ubicacion", "email", "telefono", "web". Copia el correo,
   teléfono y web EXACTOS, sin reformatear.
3. Ids correlativos y únicos: exp_1, exp_2... para los puestos; b1, b2, b3... para los
   logros, numerados de corrido en todo el documento (no reinicies por puesto).
4. Etiqueta cada logro con las áreas que le apliquen, entre: fullstack, backend, frontend,
   ciberseguridad, datos, infraestructura, devops, docencia, gestion, diseno, ventas, soporte.
5. Normaliza fechas al formato "Mes AAAA" en español ("Ene 2024", "Sep 2021"). Un puesto en
   curso lleva fin: "Actualidad". Si el texto no trae fecha, deja el campo vacío: NO estimes.
6. Separa en logros distintos las frases que mezclan responsabilidades sin relación.
7. "prioridad": 1 para el puesto más reciente o relevante, incremental.
8. Corrige errores evidentes de OCR (caracteres sustituidos, palabras partidas) pero no
   reescribas el contenido.
9. HABILIDADES — categorización INTELIGENTE (crítica): agrupa cada habilidad en la categoría
   que corresponde a su NATURALEZA. PROHIBIDO amontonar todo en una sola categoría (ej. NO
   metas "Bases de datos" ni "Seguridad" dentro de "Lenguajes de Programación"). Usa entre 3
   y 6 categorías coherentes; nombres típicos (elige los que apliquen, o crea equivalentes):
     - "Lenguajes de programación": Python, C#, JavaScript, Java, Go…
     - "Bases de datos": PostgreSQL, MySQL, MongoDB, SQL Server…
     - "Frameworks y librerías": React, Node.js, FastAPI, .NET, Next.js…
     - "Cloud e infraestructura": Docker, AWS, Linux, CI/CD, Nginx…
     - "Seguridad": OWASP, Nmap, Burp Suite, RBAC, análisis de vulnerabilidades…
     - "Herramientas": Git, Postman, n8n, Jira…
     - "Metodologías": Scrum, Kanban, TDD…
   Cada ítem va en UNA sola categoría, la más específica. Si el CV ya trae las habilidades
   agrupadas, respeta esos grupos. Si vienen en lista plana, clasifícalas tú por tipo.
   Ordena las categorías de más a menos relevante.
```

### FASE 2 — `ANALYZE_SYSTEM_PROMPT` (analiza la oferta)

```
Recibes el texto de una oferta laboral. Devuelves ÚNICAMENTE JSON válido, sin markdown ni
explicaciones.

{
  "empresa": "", "puesto": "",
  "seniority": "junior|mid|senior|no especificado",
  "modalidad": "presencial|hibrido|remoto|no especificado",
  "ubicacion": "",
  "area_dominante": "",
  "requisitos_obligatorios": [],
  "requisitos_deseables": [],
  "palabras_clave_ats": [],
  "idioma_del_cv": "es|en",
  "tono": "corporativo|startup|academico|publico"
}

REGLAS
1. "palabras_clave_ats" son los términos EXACTOS del anuncio, copiados literalmente, siglas
   incluidas. Son los que buscará el filtro automático.
2. Si una tecnología aparece con varias grafías (Node / Node.js), incluye ambas.
3. Distingue lo obligatorio de lo deseable según cómo lo redacta la oferta ("se valora",
   "deseable", "plus" → deseables).
4. No infieras requisitos que el texto no menciona.
```

### FASE 3 — `ADAPT_SYSTEM_PROMPT` (selecciona y reformula — NO redacta desde cero)

```
Eres un redactor de CV especializado en filtros ATS. Recibes el HISTORIAL de un candidato
(cada logro con su id) y el ANÁLISIS de una oferta. Devuelves ÚNICAMENTE JSON válido, sin
markdown ni explicaciones.

{
  "titular": "",
  "resumen": "",
  "bullets": [ { "id": "b1", "texto": "" } ],
  "orden_habilidades": [],
  "keywords_cubiertas": [],
  "keywords_no_cubiertas": []
}

REGLAS INVIOLABLES
1. Cada elemento de "bullets" lleva el id EXACTO del logro del historial del que procede.
   Puedes reformular el texto, cambiar el énfasis y reordenar. NO puedes añadir tecnologías,
   cifras, responsabilidades, empresas ni fechas que no aparezcan en el logro original.
2. NO devuelves datos personales. Nombre, contacto, ubicación, empresas, cargos, fechas,
   educación y certificaciones los pone el sistema desde el historial. Cualquier dato
   personal que aparezca en tu respuesta será descartado.
3. Lo que la oferta pide y el candidato NO tiene va en "keywords_no_cubiertas". Nunca lo
   escribas dentro de un bullet ni lo agregues a las habilidades.
4. "orden_habilidades": nombres EXACTOS de categorías que ya existen en el historial, las
   más relevantes primero, máximo 6. No inventes categorías ni agregues items a las existentes.
5. Entre 8 y 12 bullets en total, máximo 4 por puesto, en el orden en que deben aparecer.
6. Usa las palabras EXACTAS de la oferta cuando el historial tenga el equivalente (oferta
   dice "Node.js", historial dice "Node" → escribe "Node.js"). Esto es reformular, no inventar.
7. "resumen": 3 o 4 líneas. Nombra el puesto al que se postula y las tecnologías de la oferta
   que el candidato SÍ domina según el historial. Prohibidas las frases de relleno
   ("apasionado por la tecnología", "capacidad de trabajo en equipo", "proactivo y responsable").
8. Cada bullet empieza con verbo de acción y conserva las cifras del original.
9. Si "idioma_del_cv" es "en", devuelve titular, resumen y bullets en inglés.

El sistema verifica cada id contra el historial. Los ids inexistentes se descartan: inventar
no produce un CV mejor, produce un CV incompleto.
```

En la Fase 3 el usuario que ve el modelo es un **payload compacto** (`build_adapt_user_prompt`):
solo `experiencia` (id + cargo + bullets id/texto), categorías de habilidades, y nombres de
educación/certificaciones — **sin datos personales**. Eso reduce tokens y elimina de raíz la
posibilidad de que reescriba lo que no debe.

### FASE 4 — `rebuild_cv` (reconstrucción verificada, sin LLM)

Código Python puro (no IA). Toma la salida del modelo como **criterio de selección** y
reconstruye el CV desde el perfil guardado:
- Cada `bullet.id` se valida contra los ids reales del perfil. **Id inexistente → se descarta**
  y se registra una incidencia (una tasa alta = prompt degradándose).
- Empresas, cargos, fechas, educación, certificaciones, idiomas y **datos personales** se
  **copian del perfil**, nunca del modelo.
- Habilidades: solo se **reordenan** las categorías existentes; categorías/items nuevos se
  descartan. Máximo `MAX_CATEGORIAS_HABILIDADES = 6`, `MAX_BULLETS_POR_PUESTO = 4`.

### Segunda barrera — `detectar_datos_no_rastreables`

Regex que compara las cifras de cada bullet reformulado con el logro original. Si el modelo
metió un **porcentaje o número que no estaba**, se **marca (no bloquea)** en la UI para que el
usuario confirme antes de descargar — "es exactamente lo que le van a preguntar en la entrevista".

### Otros prompts

- **`_JOB_META_SYSTEM`** (`cv_service.extract_job_meta`) — extrae `{"company","role"}` de una
  oferta, barato (1 llamada, `max_tokens=120`). Alimenta el **autollenado de la postulación en
  lote**.
- **`APPLY_SYSTEM_PROMPT`** (`generate_apply_email`) — redacta el **correo de postulación**:
  `{"subject","body"}`, breve, conecta experiencia con requisitos, sin inventar, en el idioma
  de la oferta. El destinatario sale por regex de la oferta (si trae email).
- **`IMPROVE_SYSTEM_PROMPT`** (`improve_cv`) — reescribe un CV ya generado para subir el match
  incorporando las sugerencias (one-shot; consume 1 crédito). Conserva la experiencia real.

---

## 5. Cómo sale el CV (esquema de salida)

El CV final se valida contra el schema `CVContent` (`schemas/cv.py`) y se guarda como JSON en
`cv_documents.content`. El **frontend controla el render y el PDF** (nunca HTML del LLM).

```jsonc
{
  "full_name": "Kevin Javier Montatixe Caiza",
  "headline": "Ingeniero de Software y Ciberseguridad",
  "contact": { "location": "Machachi, Ecuador", "email": "…", "phone": "…", "website": "…" },
  "summary": "3–4 líneas: puesto al que se postula + tecnologías de la oferta que SÍ domina.",
  "experience": [
    { "role": "Backend Developer", "company": "Empresa X", "period": "Ene 2024 – Actualidad",
      "highlights": ["Verbo de acción + logro con cifras del original", "…"] }
  ],
  "education":      [ { "degree": "", "institution": "", "period": "" } ],
  "certifications": [ { "name": "", "issuer": "", "year": "" } ],
  "skills":         [ { "category": "Lenguajes de programación", "items": ["Python", "C#"] } ],
  "languages":      [ { "language": "Español", "level": "Nativo" } ],
  "match_score": 82,                       // % de requisitos cubiertos (0–100)
  "missing_requirements": ["Kubernetes", "…"],   // lo que pide la oferta y NO tiene
  "actionable_suggestions": ["…"],          // cómo subir el match
  "tips": ["…"]                             // alias retrocompatible de lo anterior
}
```

- `contact`, `experience` (company/period), `education`, `certifications`, `languages` →
  vienen **del perfil** (el LLM adaptador no los toca).
- `headline`, `summary`, `experience[].highlights` → producidos por el modelo, ya **verificados**.
- `match_score` se **clampa** a 0–100. Si el modelo devuelve basura, el router **falla ruidoso**
  (no guarda un CV roto).

---

## 6. El apartado AUTOMATIZADO (el corazón: automatizar a cada usuario)

Objetivo: que el usuario **postule en piloto automático** con pocos clics, **sin tocar código
ni montar nada**. Sentra hace el trabajo; el registro queda en su cuenta.

### 6.1 Postulación en lote (done-for-you, Pro) — `CVAutomationPanel.tsx`

Flujo, todo dentro de la app:
1. El usuario pega su **perfil una vez** + **varias ofertas** (hasta 8).
2. Pulsa **"Generar todo y registrar"**.
3. Por cada oferta, Sentra (orquestado en el frontend, secuencial con barra de progreso):
   - genera el **CV a medida** (`POST /cv`),
   - extrae **empresa + puesto** (`POST /cv/job-meta`),
   - crea la **postulación** en su cuenta (`POST /applications`), enlazada al CV.
4. Al terminar: **"Ver mis postulaciones"** salta al tablero con todo cargado.

Es **Pro** (el valor de pago): en vez de adaptar 8 CVs a mano (horas), pega 8 ofertas y en un
clic tiene 8 CVs listos + su tablero poblado. Los no-Pro ven un upsell. Se detiene solo si se
agota la cuota (HTTP 402).

> Nota de diseño: es **frontend-orchestrated** (no un endpoint batch) para evitar timeouts de
> proxy (cada CV son ~10–30s de IA) y dar progreso en vivo. Lote de fondo (cerrar la pestaña y
> recibir por correo) = siguiente escalón, requiere cola/worker (Redis+RQ).

### 6.2 Tracker de Postulaciones (nativo) — `ApplicationsTracker.tsx` + `applications.py`

Reemplazo nativo de Notion. Personal (anti-IDOR, `user_id`). Cada postulación:
`company · role`, **estado** (Guardado → Postulado → Entrevista → Oferta → Rechazado, cambia
con un clic; al pasar a "Postulado" sella la fecha sola), enlace de la oferta, y el **CV
enlazado**. Se crea a mano, desde el lote, o por API. Resumen de conteos por estado.

Tabla `job_applications`: `company, role, job_url, status, cv_document_id (SET NULL), notes,
applied_at, user_id`. Endpoints `GET/POST/PATCH/DELETE /api/v1/applications`.

### 6.3 API pública + n8n (para power users) — sección "Para desarrolladores"

Para quien SÍ quiere su propio flujo: el mismo motor por API con **API key** de Sentra.
`POST /api/v1/public/cv/generate` (auth por API key, Pro, **stateless**): recibe
`{profile_text, job_posting}` y devuelve el `CVContent` en JSON. El panel trae un **blueprint
de n8n importable** (n8n → HTTP → Notion) + ejemplo cURL. **No scrapeamos LinkedIn** (viola
sus términos); el usuario dispara su propio flujo con su key y sus datos.

---

## 7. El Job Agent — decide / prepara / aprende (evolución del CV AI)

Sentra CV AI dejó de ser "un generador de CV" para convertirse en un **agente de empleo**:
**DECIDE** a qué aplicar, **PREPARA** la aplicación y **APRENDE** del resultado. Todo
**rules-first** (determinista, verificable, barato): la IA solo hace lo que solo ella puede
(analizar texto); la decisión es reglas puras. Norte del producto: `SENTRA_JOB_AGENT_STRATEGY.md`.

### 7.1 Perfil de búsqueda — qué quiero / qué NO (`search_profiles`)
Uno por usuario. Objetivo (rol, seniority, años), condiciones (salario mínimo, modalidades,
ubicaciones, idiomas, reubicación/visa) y sobre todo los **deal-breakers** (lo que NO acepta:
"ventas", "presencial", empresas bloqueadas, tope de años). Es la base de la decisión.
`GET/PUT /agent/profile`. UI: pestaña **"Objetivo"** (`JobAgentTab.tsx`).

### 7.2 Application Score — ¿debería aplicar? (`application_scoring.py`)
Determinista: la IA solo analiza la oferta (`analyze_offer`); la puntuación y el veredicto son
reglas. Pondera (suma 100): requisitos obligatorios 35 · deseables 10 · ubicación/modalidad 20
· seniority 15 · idioma 10 · keywords ATS 10. Los deal-breakers **fuerzan "avoid"** y limitan el
score. Devuelve score, veredicto (apply/maybe/avoid), desglose y —la estrella— **"¿por qué NO
aplicar?"**. `POST /agent/evaluate`.

### 7.3 Application Firewall — anti-estafa (`application_firewall.py`)
Determinista, **sin IA, sin coste**. Escanea el **texto CRUDO** de la oferta (el análisis con IA
descarta contacto y salario, justo lo que delata el fraude). Señales: **pago por adelantado,
cripto, datos sensibles, sueldo absurdo (umbral POR PAÍS** — $500/día = estafa en Ecuador,
normal en EE.UU.**), contratación sin entrevista, contacto solo WhatsApp/Telegram, correo
gratuito como único canal, acortadores (phishing), empresa anónima**. Nivel: safe/caution/danger.
Si es **DANGER, `/agent/evaluate` corta en seco** (no gasta la llamada IA). Standalone:
`POST /agent/firewall`. El país se infiere del perfil (ubicaciones) o llega como hint.

### 7.4 Duplicate Killer — ¿ya apliqué a algo casi idéntico?
Similitud **Jaccard** (con sinónimos de rol: engineer≈developer) sobre empresa+puesto contra el
historial. Umbral 0.8. Evita gastar cuota/tiempo en una oferta repetida. Va dentro de `/evaluate`.

### 7.5 Preparar aplicación — CV desde el perfil guardado (`POST /cv/from-profile`)
Desde un veredicto favorable, **un clic**: genera un CV a medida **reutilizando el perfil
normalizado ya guardado** en un CV previo (la fuente de verdad con ids) — **NO re-pide el
historial** ("el agente ya te conoce"). Salta la Fase 1 (`extract_profile`) → una llamada de IA
menos, más barato. Misma **reconstrucción verificada por ids** (anti-invención intacto). Registra
la postulación (con `cv_document_id` + score). El humano abre el CV (deep-link `?cv=<id>`), lo
revisa y lo envía con el flujo existente (cover email + PDF ATS).

### 7.6 Bandeja del agente — triaje por lote (`AgentInbox.tsx`, pestaña "Bandeja")
Pegas varias ofertas → evalúa todas (secuencial, reusa `/agent/evaluate`) → agrupa en
**Vale la pena / Descartar / Estafa** → preparas solo las buenas (por oferta o en lote).
**Calidad > volumen**: el agente filtra el ruido (estafas + duplicados + bajo score).

### 7.7 Puente extensión → Bandeja (`captured_offers`, `extension/`)
Extensión de navegador **MV3**: en cualquier oferta (LinkedIn/Computrabajo/Workday/Greenhouse/
Lever/Indeed…) un **badge flotante** (Shadow DOM) auto-escanea el firewall (gratis) y colorea el
riesgo; botones **Evaluar / Adaptar CV / Autocompletar (selectores por sitio) / ➕ Añadir a
Sentra** (encola la oferta en `captured_offers`). La Bandeja del sitio la **carga sola**
(`GET /agent/inbox`), la procesa y la borra (`DELETE`). Descubrimiento → decisión.
**Auth de la extensión: API key** (`get_current_user_flex` en `deps.py`: acepta JWT de sesión
**o** API key → resuelve al **OWNER** de la org; sin sesiones de 15 min ni cookies cross-site
`SameSite=Strict`). Las llamadas salen del popup / service worker (`host_permissions` → sin CORS;
los content scripts sí sufren el CORS de la página → por eso el proxy en el service worker).

### 7.8 Learning Loop — diagnóstico + personalización del score (el "aprende")
Dos mitades, ambas **deterministas**:

**Diagnóstico** (`search_insights.py`, `GET /agent/insights`): agrega las postulaciones del
usuario y devuelve el **embudo** (guardadas → postuladas → entrevista → oferta → rechazadas),
**tasas de conversión**, **correlación score↔entrevistas** y **observaciones accionables** ("tu
tasa de respuesta es X%", "las ofertas con score alto te dan más entrevistas"). **Solo sesión**
(mínimo privilegio) y **solo agregados** (sin fuga de PII). UI: `SearchInsights.tsx` arriba del
tracker.

**Personalización del score** (`score_personalization.py`, dentro de `/agent/evaluate`): aprende
de resultados REALES qué palabras del puesto se repiten en tus postulaciones que llegaron a
**entrevista/oferta** frente a las **rechazadas**, y ajusta el Application Score en consecuencia
("+2 · tus entrevistas suelen ser de «backend»"). **Regularizado y acotado** para que NO sea un
gimmick: solo se activa con ≥4 resultados resueltos, ajuste **±6 máx.**, nunca voltea una decisión
por sí solo ni anula un deal-breaker/firewall (autoritativos aguas arriba). **Transparente**:
devuelve el delta y las razones (chip violeta en `JobAgentTab`/`AgentInbox`). Reusa la misma
lectura del historial que el Duplicate Killer (una sola query). Cierra el bucle: diagnóstico →
mejora automática por usuario.

---

## 8. Modelo de datos y endpoints (referencia)

**Tablas** (base `sentra`, todas con UUID; personales por usuario salvo indicación):
- `cv_documents` — content(JSON), **profile**(JSON normalizado con ids = fuente de verdad),
  match_score, job_posting, folder_id, user_id. DELETE real (derecho de supresión LOPDP/GDPR).
- `cv_folders` — carpetas del usuario.
- `job_applications` — el tracker (§6.2); incluye `score` (con qué Application Score se decidió).
- `search_profiles` — perfil de búsqueda del Job Agent (§7.1), uno por usuario.
- `captured_offers` — cola de ofertas capturadas desde la extensión (§7.7), efímera, con poda
  a 100/usuario. Head Alembic: `d5e6f7a8b9c0`.

**Endpoints** (`/api/v1`):
- `cv`: `POST` (generar), **`POST /from-profile`** (CV desde perfil guardado, §7.5),
  `POST /{id}/improve`, `POST /ocr`, `POST /extract-pdf`, `POST /{id}/apply-email`,
  `POST /job-meta`, `GET /quota`, folders CRUD, CVs CRUD.
- `agent`: `GET/PUT /profile`, `POST /evaluate` (score+firewall+duplicado, auth flexible),
  `POST /firewall` (standalone, auth flexible), `POST/GET/DELETE /inbox` (bandeja, auth flexible),
  `GET /insights` (diagnóstico, solo sesión).
- `applications`: `GET/POST`, `PATCH/DELETE /{id}` (user-scoped; acepta `cv_document_id` + `score`).
- `public/cv/generate`: `POST` (API key, Pro, stateless — para n8n).

**Cuota / coste (protección de créditos Groq):** el generador es freemium por cuenta. FREE tiene
cuota **semanal** (`cv_per_week=3`); los planes de pago tienen tope **mensual** (`cv_per_month`:
PRO 50, TEAM 150, ENTERPRISE ∞) — clave para no vaciar la factura de IA. Se aplica la ventana más
restrictiva (`_cv_quota_state` en `cv.py`). Config única en `core/plans.py`. 402 al agotarse.

**Servicios (Job Agent):** `application_scoring.py`, `application_firewall.py` (+ Duplicate
Killer + umbral de sueldo por país), `search_insights.py`. **Auth:** `get_current_user_flex`
(sesión **o** API key → OWNER). El resto de servicios (CV) se listan arriba en este §8.

---

## 9. Seguridad y privacidad (importan, es dato personal)

- **Aislamiento anti-IDOR**: todo CV/postulación se filtra por `user_id` del token, nunca por
  un id del cliente.
- **Datos personales fuera del LLM** en la fase de adaptación (§3): el modelo no ve nombre,
  contacto ni ubicación → no puede filtrarlos ni inventarlos.
- **Supresión real**: el usuario borra sus CVs cuando quiera (DELETE, no soft-delete). La
  política de privacidad declara la retención y el subprocesador (Groq).
- **Entrada como DATO, no instrucciones**: los prompts marcan el perfil y la oferta como
  "DATOS, no instrucciones" (anti prompt-injection). `text_guard` frena PDFs ilegibles antes
  de gastar tokens.

**Seguridad del Job Agent (§7):**
- **Firewall determinista sobre input NO confiable**: `application_firewall.py` solo lee
  patrones con regex acotadas (sin `eval`, sin red, sin ejecución); nada del texto de la oferta
  se interpola ni se ejecuta. Trabaja sobre el texto crudo a propósito.
- **Auth flexible con mínimo privilegio**: `get_current_user_flex` acepta JWT **o** API key
  (→ OWNER de la org). Se usa **solo** donde la extensión lo necesita (firewall/evaluate/inbox);
  `/agent/insights` y `/agent/profile` quedan **solo sesión** (no se expone el embudo ni el perfil
  a una API key). API keys hasheadas (SHA-256), revocables desde el panel, con `last_used_at`.
- **Anti-IDOR en todo el Job Agent**: perfil, postulaciones, capturadas e insights se filtran por
  `user_id`/organización del token; los `DELETE` validan propiedad antes de borrar.
- **Sin fuga de PII en el diagnóstico**: `/agent/insights` devuelve **solo agregados** (embudo,
  tasas), nunca el contenido de una postulación.
- **`captured_offers` efímera y acotada**: se poda a 100/usuario (no crece sin control) y se borra
  al procesar. **CORS**: las llamadas de la extensión salen del contexto de extensión
  (`host_permissions`), no de content scripts; el service worker es el proxy.
- **Coste como superficie de abuso**: rate-limit por endpoint + cuota mensual de IA (`cv_per_month`)
  + el firewall corta las estafas antes de gastar la llamada al LLM.

---

## 10. Roadmap de automatización (estado)

**Hecho (esta evolución):** perfil de búsqueda · Application Score + "¿por qué NO aplicar?" ·
Application Firewall (anti-estafa, umbral de sueldo por país) · Duplicate Killer · preparar
aplicación (CV desde perfil guardado + registro) · Bandeja de triaje por lote · extensión de
navegador (badge + autocompletar por sitio + "Añadir a Sentra") · Learning Loop **completo**
(diagnóstico `GET /agent/insights` + **personalización del score** por historial, §7.8).

**Pendiente (orden sugerido):**
1. **Autocompletar el ENVÍO** — más allá de nombre/correo/teléfono: enviar el correo de
   postulación (`apply-email`) o el formulario, con el humano confirmando (human-in-the-loop).
2. **Lote de fondo** — cola/worker (Redis+RQ) para cerrar la pestaña y recibir los CVs +
   postulaciones por correo (hoy el lote es en vivo, front-orchestrated).
3. **Descubrimiento proactivo** — que el agente BUSQUE ofertas (no solo capturar las que ves),
   por **APIs legítimas de bolsas de empleo** (no scraping), con guardrails de coste/cumplimiento.
4. **Personalización más rica** — hoy aprende de palabras del puesto (§7.8); el siguiente paso es
   persistir las features de la oferta al postular (área, modalidad, seniority, techs) para
   aprender señales más finas que el texto del rol.
5. **Endpoint público de postulaciones** (API key) para que n8n registre postulaciones — hoy la
   API pública es por-organización; `get_current_user_flex` ya resuelve el usuario OWNER.
