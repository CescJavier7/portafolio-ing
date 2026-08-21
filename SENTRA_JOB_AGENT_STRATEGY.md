# Sentra Job Agent — Estrategia de producto (norte)

> **Cómo usar este documento:** es el NORTE del producto. Toda decisión de Sentra CV AI /
> Sentra Job Agent debe alinearse con esto. Pégalo al inicio de una conversación con IA para
> que entienda hacia dónde va el producto (no solo qué hace hoy).
>
> Complementos: `SENTRA_CV_AI_CONTEXT.md` (cómo funciona hoy) · `SENTRA_CONTEXT.md` (negocio).
> Adoptado: 2026-08-19.

---

## 0. El giro (de dónde a dónde)

**Antes (commodity, no defendible):**
- ❌ "IA que crea tu CV." → ya es commodity.
- ❌ "IA que postula a empleos." → ya existe (Simplify, +1.5M usuarios: autofill, matching,
  tailoring, tracking, extensión para Workday/Lever/Greenhouse/Ashby/iCIMS/Taleo).

**Ahora (la tesis de Sentra):**
> "Dile a Sentra qué trabajo quieres. Sentra **encuentra** las ofertas, **decide** cuáles valen
> la pena, **adapta** tu candidatura, **completa** la aplicación (donde es legítimo) y **aprende**
> de tus resultados hasta que consigas trabajo."

No vendemos CVs ni clics. Vendemos **horas recuperadas + decisiones inteligentes + una búsqueda
laboral que se optimiza sola**. La batalla NO es "hago más aplicaciones que Simplify"; es
**"hago mejores decisiones y aplicaciones verificables"** — enfocado en **Ecuador / LatAm**.

**Principio rector (grabado a fuego):**
> **"Sentra puede reformular lo que eres, pero nunca inventar quién eres."**
> Nuestro motor anti-invención (anclado por ids) no es un detalle técnico: es la marca.

---

## 1. El bucle que ES el producto (el moat)

La ventaja acumulativa no es una feature, es este ciclo que mejora con cada uso:

```
     Perfil verificado  +  Preferencias (qué quiero / qué NO)
                    │
                    ▼
             Job Intelligence  (encuentra + entiende ofertas)
                    │
                    ▼
             Application Score  (reglas + IA, con veredicto)
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
      DESCARTAR            APLICAR
    (y decir por qué)        │
                             ▼
                     CV personalizado (verificado)
                             ▼
                   Autofill / Apply (híbrido, legítimo)
                             ▼
                      Application Memory
                             ▼
                         Resultado
                    ┌────────┴────────┐
                    ▼                 ▼
                Rechazo           Entrevista
                    └────────┬────────┘
                             ▼
                       LEARNING LOOP
                             ▼
                Mejor scoring / mejor siguiente aplicación
```

Con datos suficientes: *"para ESTE usuario, las ofertas con combinación X de skills + seniority Y
producen más entrevistas"* → Sentra deja de ser generador de CV y pasa a ser **sistema de
optimización de búsqueda laboral**. Ese ciclo, por usuario, es el moat.

---

## 2. Componentes (qué construir, en concepto)

1. **Perfil de búsqueda** (no solo un CV): cargo objetivo, país/ciudades, modalidad, salario
   mínimo, seniority, tecnologías, industrias, empresas deseadas/prohibidas, idiomas,
   disponibilidad, visa, reubicación — **y sobre todo el "qué NO aceptaría"** (deal-breakers:
   "no ventas", "no presencial", "no < $800", "no 5 años exp.", "solo Ecuador"…).

2. **Application Score** (evoluciona el Match Score): 0–100 por **reglas + IA**, ponderado:
   requisitos obligatorios 30% · experiencia 20% · skills 15% · seniority 10% ·
   ubicación/modalidad 10% · idioma 5% · salario 5% · CV/ATS 5%. Y **veredicto**:
   ≥80 Aplicar · 65–79 "aplicar solo si…" · <65 No aplicar. Con la función estrella
   **"¿por qué NO deberías aplicar?"** (evita 200 aplicaciones basura).

3. **Application Firewall** (antes de enviar): JOB → analyzer → fraud check → fit check →
   duplicate check → quality check → submit. Detecta scams (gmail sospechoso, piden dinero/
   crypto/WhatsApp raro, descripción copiada, empresa inexistente, salario absurdo, dominio
   sospechoso) y **bloquea**. + **Duplicate Killer** (ya aplicaste a algo 91% similar).

4. **Verified Application™** (explotar el anti-invención comercialmente): cada afirmación del CV
   lleva `claim → source_id → source_text → verified/confidence`. Antes de enviar: *"97% del
   contenido está respaldado por tu historial"*; lo no verificable → **"revisión requerida"**.
   Incluso **detectar exageraciones del usuario** ("declaras Python avanzado pero no hay
   evidencia profesional; ¿mantener / cambiar nivel / agregar evidencia?").

5. **Application Memory**: guarda respuestas a preguntas recurrentes ("Why do you want to work
   here?") como `question_hash + answer + company + role + confidence`. La próxima vez:
   respuesta base → contexto de la nueva empresa → adaptación → **verificación anti-invención**
   → respuesta. El usuario construye una memoria profesional.

6. **Autopilot (híbrido, human-in-the-loop)**: el usuario configura objetivo, ubicación, salario
   mínimo, modalidad, score mínimo, máx/día, idiomas → ▶ ACTIVAR. Sentra: encuentra → analiza →
   filtra → adapta → prepara → aplica (donde es legítimo) → registra → monitorea. Reporte diario:
   *"Sentra trabajó mientras dormías: 47 encontradas, 31 descartadas, 11 preparadas, 8 enviadas,
   3 requieren tu intervención. Score promedio 86."*

7. **Learning Loop**: aprende de entrevistas/rechazos y ajusta la estrategia (*"Cybersecurity
   genera 4.8× más entrevistas que IT Support → subo su prioridad"*). Diagnóstico de la búsqueda
   ("tu CV matchea técnico pero eliges ofertas de más seniority → baja el mínimo de exp.").

8. **Estados + Stop when hired**: BUSCANDO → APLICANDO → ENTREVISTA → ENTREVISTA FINAL → OFERTA →
   CONTRATADO 🎉. Al conseguir trabajo: pausar Autopilot, conservar historial. Al detectar
   entrevista: pausar aplicaciones relacionadas, preparar briefing de la empresa + preguntas.

9. **Follow-ups**: "7 días sin respuesta → [Enviar follow-up]" (IA lo redacta y registra).

10. **Sentra LatAm** (nicho, ventaja sobre Simplify): fuentes locales — Computrabajo,
    Multitrabajos, Hiring Room, LinkedIn, páginas corporativas, bolsas universitarias, sector
    público — no solo LinkedIn/Indeed/Greenhouse.

---

## 3. Guardrails de ingeniería (NO negociables — mi criterio senior)

Esto es lo que separa un producto real de uno frágil o que te meta en problemas:

- **Cumplimiento primero. NADA de scraping de LinkedIn/Indeed** (viola sus términos; Indeed
  prohíbe automatizar "Indeed Apply" con bots fuera de sus herramientas oficiales). No construir
  Sentra alrededor de "un bot que controla todas las páginas": es frágil (los selectores cambian:
  hoy `input[name=firstName]`, mañana `div[data-field=candidate_name]`) y arriesgado.
- **Automatización HÍBRIDA en 3 niveles:**
  1. **API oficial** (si la plataforma la ofrece) → Sentra aplica directo. Ideal.
  2. **Extensión de navegador** (con el usuario presente): detecta el formulario y lo completa
     (modelo probado por Simplify en Workday/Lever/Greenhouse…). Con fallback humano.
  3. **Human-in-the-loop**: ante algo sensible ("¿requieres patrocinio de visa?"), Sentra **NO
     adivina** → pregunta una vez y **aprende** la preferencia.
- **Auto-submit UNATTENDED (sin el usuario) = riesgo alto.** El "Autopilot" del MVP debe
  **preparar todo** (encontrar, puntuar, adaptar, rellenar borrador) y dejar el envío a un clic
  del usuario o a la extensión con el usuario presente. El envío 100% desatendido solo por API
  oficial y donde los ToS lo permitan.
- **Economía por aplicación (o quebramos):** 20 aplicaciones × LLM × 30 días puede costar más de
  lo que se cobra. Por eso el **Application Score es rules-FIRST** (barato, determinista,
  verificable) y la IA se usa **solo donde aporta** (adaptar el CV, extraer meta, redactar
  respuestas). Cachear análisis de oferta. Límites por plan.
- **No prometer resultados que no podamos demostrar.** Hablar de **señales y métricas
  observadas** ("+18% de probabilidad de entrevista" solo si hay datos que lo respalden), nunca
  garantías de empleo.
- **Privacidad (dato personal, LOPDP Ecuador/GDPR):** aislamiento por usuario, supresión real,
  datos personales fuera del LLM en la fase de adaptación (ya lo hacemos).

---

## 4. Modelo de precios (economía sana)

Empezar por **$3.99**. No arrancar con los tres de arriba.

| Plan | Precio | Qué incluye |
|------|--------|-------------|
| **Free** | $0 | 3–5 aplicaciones/mes. CV adaptado + score + tracker (prueba real del valor). |
| **Job Seeker** | **$3.99** | 100 aplicaciones/mes, CV adaptado, Application Score, tracker, autofill, Application Memory, scam detection. |
| **Autopilot** | $7.99 | 300/mes, búsqueda automática, reglas, aplicación automática donde es permitido, aprendizaje, seguimiento, estadísticas. |
| **Pro** | $14.99 | Mayor volumen, múltiples perfiles/CVs, API, n8n, automatizaciones avanzadas. |

> ⚠️ NO vender "1000 aplicaciones automáticas" (guerra del volumen = terreno de Simplify). Vender
> **decisiones + verificabilidad + horas recuperadas**.

Nota: hoy el plan vivo es la suite a $10/mes (Sentra seguridad + CV AI + Academia). Este tiering
es la evolución cuando el Job Agent sea el core; se puede introducir gradualmente.

---

## 5. MVP por fases (aterrizado, sin sobre-construir)

**Ya tenemos (base sólida):** motor anti-invención (ids), CVContent verificado, ingesta OCR/PDF,
editor + PDF ATS, tracker de postulaciones, generación por lote, API pública (API key), n8n.

- **FASE 1 — Job Intelligence (✅ IMPLEMENTADA).** Perfil de búsqueda persistente (objetivo +
  deal-breakers) · **Application Score** rules-first + IA con veredicto · **"¿por qué NO aplicar?"** ·
  auto-descartar por deal-breakers · **Application Firewall** (scam/fraud detection determinista,
  `application_firewall.py`: pago por adelantado, cripto, datos sensibles, sueldo absurdo, contacto
  solo WhatsApp, correo gratuito único, acortadores, empresa anónima → corta la evaluación IA si es
  estafa clara) · **Duplicate Killer** (similitud Jaccard sobre empresa+puesto vs. tu historial) ·
  CV adaptado · tracker. *No necesita scraping, extensión ni fuentes externas → 100% construible ya.*
- **FASE 2 — Extensión de navegador (✅ MVP en `extension/`).** MV3. En cualquier oferta
  (Workday/Greenhouse/Lever/LinkedIn/Computrabajo/páginas corp.): **🛡 Escanear** (Application
  Firewall gratis, sin IA) · **🎯 Evaluar** (Application Score + veredicto + Duplicate Killer) ·
  **📄 Adaptar CV** (copia la oferta y abre el generador) · **⌨ Autocompletar** (best-effort en
  formularios estándar). Human-in-the-loop. Auth por **API key** (`get_current_user_flex` →
  resuelve al OWNER de la org; sin sesiones de 15 min ni cookies cross-site). Extrae la oferta de
  la pestaña activa con `activeTab`+`scripting`; las llamadas salen del popup (host_permissions →
  sin CORS). **FASE 2.1 (✅):** badge flotante inyectado in-page (Shadow DOM) que auto-escanea el
  firewall (gratis) sobre la propia oferta en sitios curados, con manejo de SPA; autocompletado con
  **selectores por sitio** compartidos entre badge y popup (`adapters.js`); service worker de proxy
  de red (los content scripts sufren el CORS de la página). *Pendiente: páginas corp. genéricas.*
- **FASE 3 — Autopilot (híbrido). Primer eslabón (✅):** "Preparar aplicación" — desde el veredicto
  favorable del Job Agent, un clic **genera un CV a medida REUTILIZANDO el perfil ya guardado**
  (`POST /cv/from-profile`: salta `extract_profile`, 1 llamada IA menos y más barato; misma
  reconstrucción verificada por ids → sin invención) y **registra la postulación** en el tracker
  (con `cv_document_id` + score). El humano abre el CV (deep-link `?cv=<id>`), lo revisa y lo envía
  con el flujo ya existente (cover email + PDF ATS). **Bandeja del agente (✅):** pegas varias
  ofertas → evalúa todas (secuencial, reusa `/agent/evaluate`) → agrupa en **Vale la pena /
  Descartar / Estafa** (firewall+duplicado+veredicto) → prepara solo las buenas (por oferta o en
  lote). Pestaña "Bandeja" en el generador (`AgentInbox.tsx`), orquesta en cliente, sin backend
  nuevo. **Puente extensión → Bandeja (✅):** botón "Añadir a Sentra" en el badge/popup encola la
  oferta en `captured_offers` (tabla nueva, por usuario, auth flexible API key) y la Bandeja la
  carga sola (`GET /agent/inbox`), la procesa y la borra (`DELETE`). Así ves una vacante en la web →
  un clic → aparece en tu Sentra lista para el triaje. *Falta para autopilot pleno: descubrimiento
  proactivo (que el agente BUSQUE ofertas, no solo capturar las que ves) y autocompletar el ENVÍO.*
- **FASE 4 — Learning Loop.** Aplicaciones → entrevistas → rechazos → aprendizaje → mejor
  selección/scoring. Diagnóstico de la búsqueda.
- **FASE 5 — Stop when hired.** Estados de búsqueda + pausa automática + preparación de entrevista.

**Veredicto:** no es batalla perdida. Solo lo sería si Sentra termina como "otro generador de CV
+ tracker". La oportunidad es ser **"el sistema que aprende cómo conseguirle trabajo a ESTA
persona"**, verificable y para LatAm. Ahí $3–5/mes es una compra ridículamente fácil de justificar.
