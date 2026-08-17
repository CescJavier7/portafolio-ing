"""
Sentra CV — generación anclada por identificadores.

Idea central
------------
El modelo NO redacta el CV. Recibe un perfil ya normalizado en el que cada
logro tiene un id, y devuelve una lista de ids con el texto reformulado.
El backend reconstruye el documento a partir del perfil, no de la respuesta
del modelo.

Consecuencias directas:
  · Los datos personales (nombre, contacto, ubicación) nunca pasan por el LLM
    en la fase de adaptación → es imposible que invente residencia o teléfono.
  · Un logro que no exista en el perfil no tiene id válido → se descarta solo.
  · Empresas, cargos y fechas se copian del perfil, no de la salida del modelo.

Esto importa más con llama-3.3-70b que con modelos mayores: no depende de que
el modelo obedezca, sino de que el backend solo acepte lo que puede verificar.
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# FASE 1 — Normalizar el perfil a estructura con ids
# ---------------------------------------------------------------------------
# Se ejecuta al generar (a partir del profile_text) y el resultado se guarda en
# cv_documents.profile: es la fuente de verdad para reconstruir y mejorar.

EXTRACT_SYSTEM_PROMPT = """Recibes el perfil profesional de una persona (texto plano, posiblemente extraído por OCR y con errores de reconocimiento). Devuelves ÚNICAMENTE un objeto JSON válido, sin markdown, sin bloques de código, sin explicaciones.

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
1. Transcribe. No mejores, no completes, no deduzcas. Si un dato no aparece en
   el texto, el campo queda como cadena vacía.
2. PROHIBIDO inventar datos personales. Si no hay teléfono, ubicación, correo o
   LinkedIn en el texto, esos campos van vacíos. Nunca infieras una ciudad a
   partir de un nombre de empresa ni un correo a partir de un nombre.
   La cabecera del contacto suele venir en UNA sola línea separada por "|" o "·"
   (ej. "Machachi, Quito, Ecuador | correo@dominio.com | +593 98 375 5469 |
   www.sitio.dev"). Separa cada dato en su campo: "ubicacion", "email",
   "telefono", "web". Copia el correo, teléfono y web EXACTOS, sin reformatear.
3. Ids correlativos y únicos: exp_1, exp_2... para los puestos; b1, b2, b3...
   para los logros, numerados de corrido en todo el documento (no reinicies por
   puesto).
4. Etiqueta cada logro con las áreas que le apliquen, entre: fullstack,
   backend, frontend, ciberseguridad, datos, infraestructura, devops, docencia,
   gestion, diseno, ventas, soporte.
5. Normaliza fechas al formato "Mes AAAA" en español ("Ene 2024", "Sep 2021").
   Un puesto en curso lleva fin: "Actualidad". Si el texto no trae fecha, deja
   el campo vacío: NO estimes.
6. Separa en logros distintos las frases que mezclan responsabilidades sin
   relación entre sí.
7. "prioridad": 1 para el puesto más reciente o relevante, incremental.
8. Corrige errores evidentes de OCR (caracteres sustituidos, palabras partidas)
   pero no reescribas el contenido.
9. HABILIDADES — categorización INTELIGENTE (crítica): agrupa cada habilidad en
   la categoría que corresponde a su NATURALEZA. PROHIBIDO amontonar todo en una
   sola categoría (ej. NO metas "Bases de datos" ni "Seguridad" dentro de
   "Lenguajes de Programación"). Usa entre 3 y 6 categorías coherentes; nombres
   típicos (elige los que apliquen, o crea equivalentes):
     - "Lenguajes de programación": Python, C#, JavaScript, Java, Go…
     - "Bases de datos": PostgreSQL, MySQL, MongoDB, SQL Server…
     - "Frameworks y librerías": React, Node.js, FastAPI, .NET, Next.js…
     - "Cloud e infraestructura": Docker, AWS, Linux, CI/CD, Nginx…
     - "Seguridad": OWASP, Nmap, Burp Suite, RBAC, análisis de vulnerabilidades…
     - "Herramientas": Git, Postman, n8n, Jira…
     - "Metodologías": Scrum, Kanban, TDD…
   Cada ítem va en UNA sola categoría, la más específica. Si el CV ya trae las
   habilidades agrupadas, respeta esos grupos. Si vienen en lista plana,
   clasifícalas tú por tipo. Ordena las categorías de más a menos relevante.
"""


# ---------------------------------------------------------------------------
# FASE 2 — Analizar la oferta
# ---------------------------------------------------------------------------

ANALYZE_SYSTEM_PROMPT = """Recibes el texto de una oferta laboral. Devuelves ÚNICAMENTE JSON válido, sin markdown ni explicaciones.

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
1. "palabras_clave_ats" son los términos EXACTOS del anuncio, copiados
   literalmente, siglas incluidas. Son los que buscará el filtro automático.
2. Si una tecnología aparece con varias grafías (Node / Node.js), incluye ambas.
3. Distingue lo obligatorio de lo deseable según cómo lo redacta la oferta
   ("se valora", "deseable", "plus" → deseables).
4. No infieras requisitos que el texto no menciona.
"""


# ---------------------------------------------------------------------------
# FASE 3 — Adaptar (el modelo selecciona, no redacta desde cero)
# ---------------------------------------------------------------------------

ADAPT_SYSTEM_PROMPT = """Eres un redactor de CV especializado en filtros ATS. Recibes el HISTORIAL de un candidato (cada logro con su id) y el ANÁLISIS de una oferta. Devuelves ÚNICAMENTE JSON válido, sin markdown ni explicaciones.

{
  "titular": "",
  "resumen": "",
  "bullets": [ { "id": "b1", "texto": "" } ],
  "orden_habilidades": [],
  "keywords_cubiertas": [],
  "keywords_no_cubiertas": []
}

REGLAS INVIOLABLES
1. Cada elemento de "bullets" lleva el id EXACTO del logro del historial del que
   procede. Puedes reformular el texto, cambiar el énfasis y reordenar. NO
   puedes añadir tecnologías, cifras, responsabilidades, empresas ni fechas que
   no aparezcan en el logro original.
2. NO devuelves datos personales. Nombre, contacto, ubicación, empresas, cargos,
   fechas, educación y certificaciones los pone el sistema desde el historial.
   Cualquier dato personal que aparezca en tu respuesta será descartado.
3. Lo que la oferta pide y el candidato NO tiene va en "keywords_no_cubiertas".
   Nunca lo escribas dentro de un bullet ni lo agregues a las habilidades.
4. "orden_habilidades": nombres EXACTOS de categorías que ya existen en el
   historial, las más relevantes primero, máximo 6. No inventes categorías ni
   agregues items a las existentes.
5. Entre 8 y 12 bullets en total, máximo 4 por puesto, en el orden en que deben
   aparecer.
6. Usa las palabras EXACTAS de la oferta cuando el historial tenga el
   equivalente (oferta dice "Node.js", historial dice "Node" → escribe
   "Node.js"). Esto es reformular, no inventar.
7. "resumen": 3 o 4 líneas. Nombra el puesto al que se postula y las
   tecnologías de la oferta que el candidato SÍ domina según el historial.
   Prohibidas las frases de relleno ("apasionado por la tecnología",
   "capacidad de trabajo en equipo", "proactivo y responsable").
8. Cada bullet empieza con verbo de acción y conserva las cifras del original.
9. Si "idioma_del_cv" es "en", devuelve titular, resumen y bullets en inglés.

El sistema verifica cada id contra el historial. Los ids inexistentes se
descartan: inventar no produce un CV mejor, produce un CV incompleto.
"""


def build_adapt_user_prompt(profile: dict[str, Any], analysis: dict[str, Any]) -> str:
    """
    Payload compacto para la fase de adaptación.

    Solo se envían cargos y logros con sus ids. Los datos personales NO se
    incluyen: el modelo no los necesita para seleccionar, y no enviarlos
    elimina de raíz la posibilidad de que los reescriba o los invente.
    Además reduce tokens, que con cuota freemium importa.
    """
    import json

    compact = {
        "experiencia": [
            {
                "id": exp["id"],
                "cargo": exp.get("cargo", ""),
                "bullets": [{"id": b["id"], "texto": b["texto"]} for b in exp.get("bullets", [])],
            }
            for exp in profile.get("experiencia", [])
        ],
        "categorias_habilidades": list(profile.get("habilidades", {}).keys()),
        "educacion": [e.get("titulo", "") for e in profile.get("educacion", [])],
        "certificaciones": [c.get("nombre", "") for c in profile.get("certificaciones", [])],
    }

    return (
        "=== HISTORIAL DEL CANDIDATO ===\n"
        f"{json.dumps(compact, ensure_ascii=False)}\n\n"
        "=== ANÁLISIS DE LA OFERTA ===\n"
        f"{json.dumps(analysis, ensure_ascii=False)}"
    )


# ---------------------------------------------------------------------------
# FASE 4 — Reconstrucción verificada
# ---------------------------------------------------------------------------

MAX_BULLETS_POR_PUESTO = 4
MAX_CATEGORIAS_HABILIDADES = 6


def rebuild_cv(
    profile: dict[str, Any], llm_output: dict[str, Any]
) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """
    Reconstruye el CV final a partir del PERFIL, usando la salida del modelo
    únicamente como criterio de selección y redacción de logros.

    Todo lo que no sea "texto de logro", "titular" o "resumen" se toma del
    perfil almacenado. El modelo no puede alterarlo aunque lo intente.

    Devuelve (cv, incidencias). Registra las incidencias: una tasa alta indica
    que el prompt se está degradando o que el perfil quedó mal normalizado.
    """
    valid_ids = {
        b["id"]: exp
        for exp in profile.get("experiencia", [])
        for b in exp.get("bullets", [])
    }
    original_text = {
        b["id"]: b["texto"]
        for exp in profile.get("experiencia", [])
        for b in exp.get("bullets", [])
    }

    incidencias: list[dict[str, str]] = []
    por_puesto: dict[str, list[dict[str, str]]] = {}

    for item in llm_output.get("bullets", []):
        bid = item.get("id")
        texto = (item.get("texto") or "").strip()

        if bid not in valid_ids:
            incidencias.append({"tipo": "id_inexistente", "id": str(bid), "texto": texto[:120]})
            continue
        if not texto:
            texto = original_text[bid]

        exp = valid_ids[bid]
        por_puesto.setdefault(exp["id"], []).append({"id": bid, "texto": texto})

    experiencia = [
        {**exp, "bullets": por_puesto[exp["id"]][:MAX_BULLETS_POR_PUESTO]}
        for exp in sorted(profile.get("experiencia", []), key=lambda e: e.get("prioridad", 99))
        if por_puesto.get(exp["id"])
    ]

    # Habilidades: solo reordenamiento. Categorías o items nuevos se descartan.
    habilidades_perfil = profile.get("habilidades", {})
    habilidades: dict[str, list[str]] = {}
    for cat in llm_output.get("orden_habilidades", []):
        if cat in habilidades_perfil:
            habilidades[cat] = habilidades_perfil[cat]
        else:
            incidencias.append({"tipo": "categoria_inexistente", "id": str(cat), "texto": ""})
    for cat, items in habilidades_perfil.items():
        if cat not in habilidades and len(habilidades) < MAX_CATEGORIAS_HABILIDADES:
            habilidades[cat] = items

    cv = {
        # Copiados del perfil sin pasar por el modelo:
        "datos_personales": profile.get("datos_personales", {}),
        "educacion": profile.get("educacion", []),
        "certificaciones": profile.get("certificaciones", []),
        "idiomas": profile.get("idiomas", []),
        # Producidos por el modelo, ya verificados:
        "titular": (llm_output.get("titular") or profile.get("datos_personales", {}).get("titular", "")).strip(),
        "resumen": (llm_output.get("resumen") or "").strip(),
        "experiencia": experiencia,
        "habilidades": dict(list(habilidades.items())[:MAX_CATEGORIAS_HABILIDADES]),
        # Diagnóstico para el usuario:
        "keywords_cubiertas": llm_output.get("keywords_cubiertas", []),
        "keywords_no_cubiertas": llm_output.get("keywords_no_cubiertas", []),
    }
    return cv, incidencias


def detectar_datos_no_rastreables(cv: dict[str, Any], profile: dict[str, Any]) -> list[str]:
    """
    Segunda barrera, para marcar (no bloquear) en la UI.

    Busca cifras en los bullets reescritos que no estén en el logro original.
    Reformular está permitido; inventar un porcentaje o un número de usuarios,
    no. Se le muestra al usuario para que confirme antes de descargar, porque
    es exactamente lo que le van a preguntar en la entrevista.
    """
    import re

    originales = {
        b["id"]: b["texto"]
        for exp in profile.get("experiencia", [])
        for b in exp.get("bullets", [])
    }
    num = re.compile(r"\d[\d.,]*\s*%?")
    avisos: list[str] = []

    for exp in cv.get("experiencia", []):
        for b in exp.get("bullets", []):
            orig = originales.get(b["id"], "")
            nuevas = set(num.findall(b["texto"])) - set(num.findall(orig))
            if nuevas:
                avisos.append(
                    f"«{b['texto'][:80]}…» contiene cifras que no están en el logro original: "
                    + ", ".join(sorted(nuevas))
                )
    return avisos
