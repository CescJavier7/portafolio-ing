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

## 7. Modelo de datos y endpoints (referencia)

**Tablas** (base `sentra`, todas con UUID; CVs y postulaciones son **personales por usuario**):
- `cv_documents` — content(JSON), **profile**(JSON normalizado con ids = fuente de verdad),
  match_score, job_posting, folder_id, user_id. DELETE real (derecho de supresión LOPDP/GDPR).
- `cv_folders` — carpetas del usuario.
- `job_applications` — el tracker (§6.2).

**Endpoints** (`/api/v1`):
- `cv`: `POST` (generar), `POST /{id}/improve`, `POST /ocr`, `POST /extract-pdf`,
  `POST /{id}/apply-email`, `POST /job-meta`, `GET /quota`, folders CRUD, CVs CRUD.
- `applications`: `GET/POST`, `PATCH/DELETE /{id}` (user-scoped).
- `public/cv/generate`: `POST` (API key, Pro, stateless — para n8n).

**Servicios:** `cv_service.py` (llamadas Groq + orquestación), `cv_prompts.py` (prompts +
rebuild anti-invención), `ocr_service.py` (Tesseract), `pdf_service.py`, `file_guard.py`
(valida subidas), `text_guard.py` (detecta texto ilegible).

---

## 8. Seguridad y privacidad (importan, es dato personal)

- **Aislamiento anti-IDOR**: todo CV/postulación se filtra por `user_id` del token, nunca por
  un id del cliente.
- **Datos personales fuera del LLM** en la fase de adaptación (§3): el modelo no ve nombre,
  contacto ni ubicación → no puede filtrarlos ni inventarlos.
- **Supresión real**: el usuario borra sus CVs cuando quiera (DELETE, no soft-delete). La
  política de privacidad declara la retención y el subprocesador (Groq).
- **Entrada como DATO, no instrucciones**: los prompts marcan el perfil y la oferta como
  "DATOS, no instrucciones" (anti prompt-injection). `text_guard` frena PDFs ilegibles antes
  de gastar tokens.

---

## 9. Roadmap de automatización (orden sugerido)

1. **Lote de fondo** — cola/worker para que el usuario cierre la pestaña y reciba los CVs +
   postulaciones por correo (hoy es en vivo, front-orchestrated).
2. **"Postular de verdad"** — sumar el **envío del correo de postulación** (ya existe
   `apply-email`) dentro del lote: genera CV + manda el correo + registra, en un clic.
3. **Endpoint público de postulaciones** (API key) para que n8n **registre** postulaciones al
   generar CVs (cierra el loop del automatizador externo). Ojo: hoy las postulaciones son
   por-usuario y la API pública es por-organización → definir a qué usuario se asocian.
4. **Extensión de navegador** "Adaptar a esta oferta" — en la página de una vacante, un clic
   genera el CV + registra la postulación (iniciado por el usuario, sin scraping).
5. **Conectores a bolsas de empleo** por APIs legítimas (no scraping).
