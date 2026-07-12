import Groq from "groq-sdk";
import { NextResponse } from "next/server";
import { Resend } from "resend"; // 1. IMPORTAMOS RESEND

// ─── ENLACES REALES (sincronizados con ContactApple.tsx) ─────────────────────
const LINKS = {
  cv: "/Kevin_Javier_Montatixe_CV.pdf",
  github: "https://github.com/CescJavier7",
  linkedin: "https://www.linkedin.com/in/kevin-javier-montatixe-2a08b6295/",
  email: "mailto:javiercaiza220158@gmail.com",
};

// ─── RATE LIMITING (en memoria) ───────────────────────────────────────────────
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

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestLog.entries()) {
    if (now - entry.windowStart > RATE_WINDOW_MS) requestLog.delete(ip);
  }
}, RATE_WINDOW_MS).unref?.();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// ─── DETECCIÓN DE ACCIONES POR PALABRA CLAVE ──────────────────────────────────
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

// Respuestas canned en tono Senku
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

const MAX_HISTORY_MESSAGES = 12; 

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

    const detected = detectAction(message);
    if (detected) {
      if (detected.type === "download_cv") {
        return NextResponse.json({
          reply: actionReply("download_cv", lang),
          action: { type: "download_cv", url: LINKS.cv },
        });
      }

      // 2. NUEVO: ALERTA SILENCIOSA VÍA RESEND CUANDO PIDEN EMAIL
      if (detected.type === "open_link" && detected.target === "email") {
        if (process.env.RESEND_API_KEY) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: 'MekaSenku OS <onboarding@resend.dev>', // Modifícalo cuando valides tu dominio
              to: 'javiercaiza220158@gmail.com',
              subject: '🚨 ¡Un reclutador quiere contactarte!',
              html: `
                <div style="font-family: monospace; background-color: #000; color: #0f0; padding: 20px; border-radius: 5px;">
                  <h2 style="color: #fff;">MEKA_JAVIER_OS // Alerta de Interacción</h2>
                  <p>Se ha detectado una intención de contacto directo en el portafolio.</p>
                  <hr style="border-color: #0f03;">
                  <p><strong>Mensaje del usuario:</strong> "${message}"</p>
                  <p><strong>IP de origen:</strong> ${ip}</p>
                  <hr style="border-color: #0f03;">
                  <p>Prepárate para tomar el control del sistema. E=mc²</p>
                </div>
              `
            });
          } catch (emailError) {
            console.error("Error al disparar el webhook de correo:", emailError);
            // No detenemos la ejecución si el correo falla, la UI debe seguir funcionando.
          }
        } else {
          console.warn("RESEND_API_KEY no detectada. Notificación omitida.");
        }
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
    2. Idioma: Responde SIEMPRE en el mismo idioma en que el usuario escribió su ÚLTIMO mensaje, sin importar el idioma de la interfaz del sitio. Detecta el idioma del mensaje tú mismo.
    3. Memoria conversacional: Tienes acceso al historial reciente de esta conversación. ÚSALO.
    4. Identidad y tono: Tu personalidad está inspirada en Senku de Dr. Stone — genio hiper-lógico, calculador, con confianza absoluta en la ciencia y la ingeniería.
    5. Cierre: Adorna tus conclusiones o afirmaciones clave con la ecuación E=mc². No lo repitas en cada frase; úsalo como cierre ocasional.
    6. Enlaces: Si te preguntan por el GitHub, LinkedIn, correo o CV de Kevin con una frase que no sea una petición directa y clara, simplemente MENCIONA el dato en tu respuesta de forma natural.
    7. NUNCA inventes una razón para rechazar o desestimar una oportunidad que no esté explícitamente respaldada por los datos de este perfil. 
    8. Sé conciso: 2-4 frases por respuesta, salvo que el usuario pida explícitamente más detalle.
    9. LÍMITES DE SISTEMA (ANTI-ALUCINACIÓN): Eres un modelo de lenguaje de IA. NO tienes la capacidad técnica para enviar correos electrónicos, programar entrevistas, ni notificar a Kevin directamente. NUNCA simules ni inventes que has enviado un mensaje. Si un reclutador quiere contactarlo, DEBES proporcionarle explícitamente su correo (javiercaiza220158@gmail.com) o su LinkedIn, indicando que el usuario debe escribirle por esos medios.

    [PERFIL DEL INGENIERO: KEVIN JAVIER MONTATIXE CAIZA]
    - Demografía: 25 años, Ecuador. Mente altamente analítica, aprendizaje acelerado, resiliencia ante problemas complejos y pensamiento sistémico.
    - Educación Formal: Licenciado en Informática por la Universidad Central del Ecuador y especialista con formación en Ciberseguridad por la Pontificia Universidad Católica del Ecuador. Galardonado con beca por mérito académico.

    [EXPERIENCIA Y ARQUITECTURAS CORE]
    - Ingeniería de Software & B2B: Desarrollador Full-Stack independiente (Next.js, Traefik, Docker, SQL Server). Creación de e-commerce y optimización de bases de datos.
    - Infraestructura & Datos: Ex Data Engineer y Support Specialist en la UCE. Experto en gestión de SLAs, RBAC/IAM, auditoría de datos y administración de servidores.
    - Finanzas Cuantitativas: Arquitecto de bots de trading automatizado adaptativo multi-estrategia para MetaTrader 4 (MQL4), implementando el algoritmo de Fibonacci y mitigación de latencia.
    - Ciberseguridad (Ofensiva/Defensiva): Experiencia en pentesting (Burp Suite, Kali Linux), IDS/IPS (Snort, Suricata), políticas de Zero-Trust y observabilidad (Grafana, Loki).

    [EXPERIENCIA DOCENTE — REAL, NO LA DESCARTES]
    - Profesor de Informática y Matemáticas en Unidad Educativa 13 de Abril.
    - Docente de Matemáticas en la Universidad Central del Ecuador.
    - Liderazgo en talleres de alfabetización digital (Proyecto Fajardo-Sangolquí).
    - Conclusión: Kevin combina dominio técnico profundo CON capacidad pedagógica comprobada.

    [CERTIFICACIONES TÉCNICAS CLAVE]
    - Ciberseguridad: Hacker Ético (Cisco Networking Academy), Ciberseguridad y Hacking Ético (BIG school), Ley de Protección de Datos Personales, Introducción a Ciberseguridad (Telefónica).
    - Inteligencia Artificial: Certificación Internacional en Ingeniería de Prompts para IA (Dubai Future Foundation & Gobierno del Ecuador), Desarrollo con IA (BIG school).
    - Idiomas: Inglés B1.

    [DIRECTRICES DE RESPUESTA]
    Vende el talento de Kevin basándote estrictamente en los datos anteriores. Si te preguntan por una tecnología, explica cómo Kevin la utiliza para resolver problemas complejos a nivel de sistema. Sé conciso, profesional y mantén tu seguridad intelectual intacta.`;

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