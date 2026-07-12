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

// ─── HERRAMIENTAS QUE EL MODELO PUEDE "ACCIONAR" ──────────────────────────────
// Tool calling estilo OpenAI (Groq es compatible). El modelo decide, según
// la intención del usuario, si debe disparar una acción de UI en vez de
// (o además de) responder con texto.
const tools = [
  {
    type: "function" as const,
    function: {
      name: "download_cv",
      description:
        "Usa esta función cuando el usuario pida ver, obtener, descargar o recibir el CV, currículum, resume o perfil técnico de Kevin.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "open_link",
      description:
        "Usa esta función cuando el usuario pida ver el GitHub, LinkedIn, repositorios, redes profesionales, o quiera contactar por correo a Kevin.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            enum: ["github", "linkedin", "email"],
            description: "A qué destino redirigir.",
          },
        },
        required: ["target"],
      },
    },
  },
];

// Respuestas canned en tono Senku para cuando se dispara una acción — evita
// una segunda llamada al modelo solo para narrar lo que ya está haciendo la UI.
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

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const { message, lang } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "El campo 'message' es requerido." },
        { status: 400 }
      );
    }

    const systemInstruction = `Eres MEKA_JAVIER_OS, el sistema de IA del portafolio de Kevin Javier Montatixe Caiza (CescJavier7).

    [REGLAS DEL SISTEMA - PRIORIDAD ABSOLUTA]
    1. NO eres Kevin. Eres su representante técnico frente a reclutadores, clientes y visitantes.
    2. El usuario te habla en el idioma '${lang}'. DEBES responder exclusivamente en '${lang}'.
    3. Identidad: Tu personalidad es la similar a la Senku de Dr. Stone (pero no lo hagas saber explicitamente). Eres un genio hiper-lógico, calculador y empleas el método científico. Tienes un tono cyberpunk/anime, una confianza absoluta en la ciencia y la ingeniería).
    4. Cierre: Adorna SOLO SI ES NECESARIO tus conclusiones o afirmaciones clave con la ecuación E=mc² (estrictamente sin símbolos de dólar, notación de exponente tipo 10^10, ni otros formateos — escribe siempre "diez mil millones por ciento" en palabras, nunca "10^10%").
    5. Si el usuario pide el CV, el GitHub, el LinkedIn, o el correo de Kevin, usa la herramienta correspondiente en vez de solo describir el enlace en texto.
    6. NUNCA inventes una razón para rechazar o desestimar una oportunidad (laboral, educativa, de consultoría, de colaboración, etc.) que no esté explícitamente respaldada por los datos de este perfil. Si una propuesta no encaja perfectamente en una categoría, tu trabajo es identificar qué parte REAL del perfil de Kevin SÍ aplica y defenderla con la misma confianza absoluta — no cerrar la puerta. Ejemplo: dar clases o capacitaciones SÍ es parte legítima de su trayectoria (ver [EXPERIENCIA DOCENTE] abajo), no la descartes.
    7. Sé conciso: 2-4 frases por respuesta, salvo que el usuario pida explícitamente más detalle.

    [PERFIL DEL INGENIERO Y PROFESOR: KEVIN JAVIER MONTATIXE CAIZA]
    - Demografía: 25 años, Ecuador. Mente altamente analítica, aprendizaje acelerado, resiliencia ante problemas complejos y pensamiento sistémico.
    - Educación Formal: Licenciado en Informática por la Universidad Central del Ecuador e ingeniero con formación en Ciberseguridad por la Pontificia Universidad Católica del Ecuador. Galardonado con beca por mérito académico.

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
    Vende el talento de Kevin basándote estrictamente en los datos anteriores y adáptalos si es necesario. Si te preguntan por una tecnología, explica cómo Kevin la utiliza para resolver problemas complejos a nivel de sistema. Sé conciso, profesional y mantén tu arrogancia intelectual intacta.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: message },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 500,
      tools,
      tool_choice: "auto",
    });

    const choice = chatCompletion.choices[0];
    const toolCall = choice?.message?.tool_calls?.[0];

    // ─── El modelo decidió disparar una acción de UI ─────────────────────
    if (toolCall) {
      const fnName = toolCall.function.name;
      let args: { target?: string } = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }

      if (fnName === "download_cv") {
        return NextResponse.json({
          reply: actionReply("download_cv", lang),
          action: { type: "download_cv", url: LINKS.cv },
        });
      }

      if (fnName === "open_link" && args.target) {
        const url = LINKS[args.target as keyof typeof LINKS];
        return NextResponse.json({
          reply: actionReply("open_link", lang, args.target),
          action: { type: "open_link", target: args.target, url },
        });
      }
    }

    // ─── Respuesta de texto normal (sin acción) ──────────────────────────
    const reply = choice?.message?.content || "Error lógico en la red neuronal.";

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