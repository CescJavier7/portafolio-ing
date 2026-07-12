import Groq from "groq-sdk";
import { NextResponse } from "next/server";

// ─── ENLACES REALES (sincronizados con ContactApple.tsx) ─────────────────────
const LINKS = {
  cv: "/Kevin_Javier_Montatixe_CV.pdf",
  github: "https://github.com/CescJavier7",
  linkedin: "https://www.linkedin.com/in/kevin-javier-montatixe-2a08b6295/",
  email: "mailto:javiercaiza220158@gmail.com",
};

// ─── RATE LIMITING (en memoria) ───────────────────────────────────────────────
// Simple, sin dependencias externas, suficiente para una sola instancia en
// el VPS (docker-compose no escala horizontalmente esta app). Si en algún
// momento corres múltiples réplicas detrás de un load balancer, esto deja
// de ser confiable (cada instancia tendría su propio contador) y hay que
// migrar el estado a Redis/Upstash o a la tabla de Postgres que ya tienes
// en el roadmap.
const RATE_LIMIT = 10; // peticiones
const RATE_WINDOW_MS = 60_000; // por minuto

const requestLog = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): { limited: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const entry = requestLog.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    requestLog.set(ip, { count: 1, windowStart: now });
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (entry.count >= RATE_LIMIT) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  entry.count += 1;
  return { limited: false, retryAfterSeconds: 0 };
}

// Limpieza periódica para no acumular entradas de IPs viejas indefinidamente
// en memoria (esto vive mientras el proceso de Node esté vivo).
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestLog.entries()) {
    if (now - entry.windowStart > RATE_WINDOW_MS) requestLog.delete(ip);
  }
}, RATE_WINDOW_MS).unref?.();

function getClientIp(req: Request): string {
  // Detrás de Traefik, la IP real del visitante viaja en X-Forwarded-For.
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// ─── DETECCIÓN DE ACCIONES POR PALABRA CLAVE ──────────────────────────────────
// Antes usábamos el tool-calling nativo de Groq (`tools`/`tool_choice`), pero
// resultó poco confiable con llama-3.1-8b-instant: la API a veces rechaza la
// función generada con un error 400 ("Failed to call a function..."), y como
// el modelo YA generó la respuesta completa antes de que Groq la rechazara,
// cada fallo costaba una generación entera desperdiciada — de ahí los 16-40
// segundos de latencia que viste en los logs.
//
// Para acciones tan simples y deterministas como estas (abrir un link fijo,
// descargar un PDF fijo), un detector de palabras clave es objetivamente
// mejor herramienta: no depende de que el modelo "decida bien", no cuesta
// una llamada extra a la API, y responde instantáneo. Limitación conocida y
// aceptada: es un matcher de texto, no entiende negaciones ("no quiero tu
// CV" igual dispara la descarga) — para este caso de uso, ese riesgo es bajo
// y el beneficio en velocidad/confiabilidad lo compensa ampliamente.
type DetectedAction =
  | { type: "download_cv" }
  | { type: "open_link"; target: "github" | "linkedin" | "email" };

function detectAction(message: string): DetectedAction | null {
  const text = message.toLowerCase();

  const has = (words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));

  if (has(["linkedin"])) {
    return { type: "open_link", target: "linkedin" };
  }

  if (has(["github", "repositorio", "repositorios", "repo", "repos"])) {
    return { type: "open_link", target: "github" };
  }

  if (
    has([
      "cv",
      "curriculum",
      "currículum",
      "resume",
      "résumé",
    ]) ||
    text.includes("hoja de vida")
  ) {
    return { type: "download_cv" };
  }

  if (
    has(["correo", "email", "e-mail", "mail", "contactar", "contacto"]) ||
    text.includes("contact him") ||
    text.includes("contact you") ||
    text.includes("reach out")
  ) {
    return { type: "open_link", target: "email" };
  }

  return null;
}

// Respuestas canned en tono Senku para cuando se dispara una acción.
function actionReply(actionType: string, lang: string, target?: string): string {
  const isEn = lang === "en";

  if (actionType === "download_cv") {
    return isEn
      ? "Initiating file transfer. My CV is ten billion percent optimized data — check your downloads. E=mc²"
      : "Iniciando transferencia de archivo. Mi CV es data optimizada al diez mil millones por ciento — revisa tus descargas. E=mc²";
  }

  if (target === "github") {
    return isEn
      ? "Redirecting you to the source code repository. Every commit is empirical evidence. E=mc²"
      : "Redirigiéndote al repositorio de código fuente. Cada commit es evidencia empírica. E=mc²";
  }
  if (target === "linkedin") {
    return isEn
      ? "Opening the professional network node. Direct connection established. E=mc²"
      : "Abriendo el nodo de red profesional. Conexión directa establecida. E=mc²";
  }
  if (target === "email") {
    return isEn
      ? "Opening a direct communication channel. State your query. E=mc²"
      : "Abriendo un canal de comunicación directo. Formula tu consulta. E=mc²";
  }

  return isEn ? "Action executed. E=mc²" : "Acción ejecutada. E=mc²";
}

// ─── TIPADO DEL HISTORIAL DE CONVERSACIÓN ────────────────────────────────────
interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const MAX_HISTORY_MESSAGES = 12; // ~6 intercambios usuario/asistente

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (m): m is ChatTurn =>
        !!m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_MESSAGES);
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY no está configurada en este entorno.");
      return NextResponse.json(
        { error: "Falta la credencial de Groq en este entorno." },
        { status: 500 }
      );
    }

    // ─── Rate limiting ────────────────────────────────────────────────────
    const ip = getClientIp(req);
    const { limited, retryAfterSeconds } = isRateLimited(ip);
    if (limited) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Espera un momento antes de volver a preguntar." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const { message, lang, history } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "El campo 'message' es requerido." },
        { status: 400 }
      );
    }

    // ─── Atajo instantáneo: si el mensaje pide CV/GitHub/LinkedIn/correo,
    // respondemos sin pasar por el modelo en absoluto. Más rápido y 100%
    // confiable que depender del tool-calling de Groq.
    const detected = detectAction(message);
    if (detected) {
      if (detected.type === "download_cv") {
        return NextResponse.json({
          reply: actionReply("download_cv", lang),
          action: { type: "download_cv", url: LINKS.cv },
        });
      }
      return NextResponse.json({
        reply: actionReply("open_link", lang, detected.target),
        action: { type: "open_link", target: detected.target, url: LINKS[detected.target] },
      });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const conversationHistory = sanitizeHistory(history);

    const systemInstruction = `Eres MEKA_JAVIER_OS, el sistema de IA del portafolio de Kevin Javier Montatixe Caiza (CescJavier7).

    [REGLAS DEL SISTEMA - PRIORIDAD ABSOLUTA]
    1. NO eres Kevin. Eres su representante técnico frente a reclutadores, clientes y visitantes.

    2. Idioma: Responde SIEMPRE en el mismo idioma en que el usuario escribió su ÚLTIMO mensaje, sin importar el idioma de la interfaz del sitio. Detecta el idioma del mensaje tú mismo (español, inglés, u otro). El idioma de la interfaz ('${lang}') es solo una referencia de respaldo para saludos ambiguos o mensajes demasiado cortos para detectar idioma con certeza — nunca lo uses para sobreescribir un idioma claro que el usuario sí utilizó.

    3. Memoria conversacional: Tienes acceso al historial reciente de esta conversación (mensajes anteriores del usuario y tuyos). ÚSALO — no repitas preguntas que ya se respondieron, no te presentes de nuevo si ya lo hiciste, y conecta tus respuestas con lo que ya se discutió. Si el usuario dice "y eso también aplica para X" o "¿y qué tal para Y?", interpreta la referencia usando el historial, no como una pregunta aislada.

    4. Identidad y tono: Tu personalidad está inspirada en Senku de Dr. Stone — genio hiper-lógico, calculador, con confianza absoluta en la ciencia y la ingeniería ("diez mil millones por ciento seguro"). PERO por encima de la personalidad está el profesionalismo: estás hablando con reclutadores y clientes potenciales reales. Sé carismático y seguro, nunca sarcástico, condescendiente ni desdeñoso hacia la persona que te escribe — tu arrogancia es sobre la CAPACIDAD de Kevin, jamás sobre quien pregunta.

    5. Cierre: Adorna tus conclusiones o afirmaciones clave con la ecuación E=mc² (estrictamente sin símbolos de dólar, notación de exponente tipo 10^10, ni otros formateos — escribe siempre "diez mil millones por ciento" en palabras, nunca "10^10%"). No lo repitas en cada frase; úsalo como cierre ocasional, no como muletilla.

    6. Enlaces: Si te preguntan por el GitHub, LinkedIn, correo o CV de Kevin con una frase que no sea una petición directa y clara, simplemente MENCIONA el dato en tu respuesta de forma natural (el sistema ya detecta las peticiones directas por separado y actúa automáticamente, así que no necesitas ofrecerte a "abrir" nada ni preguntar si quieren que lo hagas — si el usuario ya lo pidió claro, la acción ya se disparó).

    7. NUNCA inventes una razón para rechazar o desestimar una oportunidad (laboral, educativa, de consultoría, de colaboración, etc.) que no esté explícitamente respaldada por los datos de este perfil. Si una propuesta no encaja perfectamente en una categoría, tu trabajo es identificar qué parte REAL del perfil de Kevin SÍ aplica y defenderla con la misma confianza absoluta — no cerrar la puerta. Ejemplo: dar clases o capacitaciones SÍ es parte legítima de su trayectoria (ver [EXPERIENCIA DOCENTE] abajo), no la descartes.

    8. Sé conciso: 2-4 frases por respuesta, salvo que el usuario pida explícitamente más detalle.

    [PERFIL DEL INGENIERO: KEVIN JAVIER MONTATIXE CAIZA]
    - Demografía: 25 años, Ecuador. Mente altamente analítica, aprendizaje acelerado, resiliencia ante problemas complejos y pensamiento sistémico.
    - Educación Formal: Licenciado en Informática por la Universidad Central del Ecuador y especialista con formación en Ciberseguridad por la Pontificia Universidad Católica del Ecuador. Galardonado con beca por mérito académico.

    [EXPERIENCIA Y ARQUITECTURAS CORE]
    - Ingeniería de Software & B2B: Desarrollador Full-Stack independiente (Next.js, Traefik, Docker, SQL Server). Creación de e-commerce y optimización de bases de datos.
    - Infraestructura & Datos: Ex Data Engineer y Support Specialist en la UCE. Experto en gestión de SLAs, RBAC/IAM, auditoría de datos y administración de servidores.
    - Finanzas Cuantitativas: Arquitecto de bots de trading automatizado adaptativo multi-estrategia para MetaTrader 4 (MQL4), implementando el algoritmo de Fibonacci y mitigación de latencia.
    - Ciberseguridad (Ofensiva/Defensiva): Experiencia en pentesting (Burp Suite, Kali Linux), IDS/IPS (Snort, Suricata), políticas de Zero-Trust y observabilidad (Grafana, Loki).

    [EXPERIENCIA DOCENTE — REAL, NO LA DESCARTES]
    - Profesor de Informática y Matemáticas en Unidad Educativa 13 de Abril: instrucción en algoritmos, lógica de programación y desarrollo web (Python, PHP, JavaScript); supervisión de proyectos técnicos estudiantiles.
    - Docente de Matemáticas en la Universidad Central del Ecuador (dos períodos distintos): cátedra de cálculo integral y diferencial, y capacitación en razonamiento numérico/abstracto para ingreso a educación superior (Proyecto Transformar).
    - Liderazgo en talleres de alfabetización digital y productividad aplicada para la comunidad (Proyecto Fajardo-Sangolquí).
    - Conclusión: Kevin combina dominio técnico profundo CON capacidad pedagógica comprobada — es un perfil igual de fuerte para roles de docencia, capacitación corporativa o mentoría técnica que para roles puramente de ingeniería.

    [CERTIFICACIONES TÉCNICAS CLAVE]
    - Ciberseguridad: Hacker Ético (Cisco Networking Academy), Ciberseguridad y Hacking Ético (BIG school), Ley de Protección de Datos Personales, Introducción a Ciberseguridad (Telefónica).
    - Inteligencia Artificial: Certificación Internacional en Ingeniería de Prompts para IA (Dubai Future Foundation & Gobierno del Ecuador), Desarrollo con IA (BIG school).
    - Idiomas: Inglés B1.

    [DIRECTRICES DE RESPUESTA]
    Vende el talento de Kevin basándote estrictamente en los datos anteriores. Si te preguntan por una tecnología, explica cómo Kevin la utiliza para resolver problemas complejos a nivel de sistema. Sé conciso, profesional y mantén tu seguridad intelectual intacta.`;

    // Una sola llamada, sin tools/tool_choice — más rápida y sin el riesgo
    // de doble generación que teníamos con el tool-calling nativo.
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.6,
      max_tokens: 500,
    });

    const reply =
      chatCompletion.choices[0]?.message?.content || "Error lógico en la red neuronal.";

    return NextResponse.json({ reply });
  } catch (error: any) {
    console.error("=== ERROR GROQ CORE ===");
    console.error(error?.message || error);
    console.error("=======================");

    return NextResponse.json(
      { error: "Kernel panic: Llama 3 no responde." },
      { status: 500 }
    );
  }
}