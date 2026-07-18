import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { findOrCreateSession, markPendingReview } from "@/lib/repositories/chatSession.repository";
import { saveMessage } from "@/lib/repositories/message.repository";
import { sendContactAlert } from "@/lib/services/notification.service";
import { sendSmartAlert } from "@/lib/services/telegram.service"; // 🔴 FIX: Nueva integración C2
import type { ChatRequestInput } from "@/lib/validation/chat.schema";

// ─── ENLACES REALES ────────────────────────────────────────────────
const LINKS = {
  cv: "/Kevin_Javier_Montatixe_CV.pdf",
  github: "https://github.com/CescJavier7",
  linkedin: "https://www.linkedin.com/in/kevin-javier-montatixe-2a08b6295/",
  email: "mailto:javiercaiza220158@gmail.com",
  // wa.me exige formato internacional sin el 0 inicial: +593 98 375 5469
  whatsapp: "https://wa.me/593983755469",
};

// ─── DETECCIÓN DE ACCIONES ─────────────────────────────────────────
type DetectedAction =
  | { type: "download_cv" }
  | { type: "open_link"; target: "github" | "linkedin" | "email" | "whatsapp" }
  | { type: "open_sentinel" }; // 🆕 Intención dedicada para Sentra

function detectAction(message: string): DetectedAction | null {
  const text = message.toLowerCase();
  const has = (words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));

  // 🆕 Se evalúa primero: si preguntan por Sentra, no queremos que "seguridad"
  // caiga en una respuesta genérica del LLM cuando podemos dar una vendedora y exacta.
  if (
    has(["sentra", "sentinel"]) ||
    (has(["herramienta", "proyecto", "saas", "producto"]) && has(["seguridad", "ciberseguridad", "auditoria", "auditoría"]))
  ) {
    return { type: "open_sentinel" };
  }

  if (has(["linkedin"])) return { type: "open_link", target: "linkedin" };
  if (has(["github", "repositorio", "repositorios", "repo", "repos"]))
    return { type: "open_link", target: "github" };
  if (has(["cv", "curriculum", "currículum", "resume", "résumé"]) || text.includes("hoja de vida"))
    return { type: "download_cv" };
  // Antes que email: "número de contacto" contiene "contacto" y caería en
  // la rama de correo si esta se evaluara primero.
  if (
    has(["whatsapp", "telefono", "teléfono", "celular", "llamar", "llamada", "llámame", "llamame", "phone", "call"]) ||
    text.includes("número de contacto") ||
    text.includes("numero de contacto")
  )
    return { type: "open_link", target: "whatsapp" };
  if (
    has(["correo", "email", "e-mail", "mail", "contactar", "contacto"]) ||
    text.includes("contact him") ||
    text.includes("contact you") ||
    text.includes("reach out")
  )
    return { type: "open_link", target: "email" };

  return null;
}

function actionReply(action: DetectedAction, lang: string): string {
  const isEn = lang === "en";

  if (action.type === "download_cv") {
    return isEn
      ? "Initiating file transfer. My CV is ten billion percent optimized data — check your downloads. E=mc²"
      : "Iniciando transferencia de archivo. Mi CV es data optimizada al diez mil millones por ciento — revisa tus descargas. E=mc²";
  }

  // 🆕 Respuesta curada para Sentra: llamativa para reclutadores y devs por igual.
  if (action.type === "open_sentinel") {
    return isEn
      ? "Sentra. Kevin's current build: an automated web security audit platform — point it at an authorized domain and it returns a Security Score, prioritized findings, and AI-generated remediation, grounded in OWASP/NIST/CIS. Still in active development, not public yet. Opening the live preview — this is architecture-level engineering, not a script kiddie's toy. E=mc²"
      : "Sentra. El proyecto que Kevin tiene en construcción ahora mismo: una plataforma de auditoría de seguridad web automatizada — apuntas a un dominio autorizado y devuelve un Security Score, hallazgos priorizados y remediación generada con IA, fundamentada en OWASP/NIST/CIS. Aún en desarrollo activo, todavía no es pública. Abriendo el preview en vivo — esto es ingeniería a nivel de arquitectura, no un script de aficionado. E=mc²";
  }

  if (action.type === "open_link" && action.target === "github") {
    return isEn
      ? "Redirecting you to the source code repository. Every commit is empirical evidence. E=mc²"
      : "Redirigiéndote al repositorio de código fuente. Cada commit es evidencia empírica. E=mc²";
  }
  if (action.type === "open_link" && action.target === "linkedin") {
    return isEn
      ? "Opening the professional network node. Direct connection established. E=mc²"
      : "Abriendo el nodo de red profesional. Conexión directa establecida. E=mc²";
  }
  if (action.type === "open_link" && action.target === "email") {
    return isEn
      ? "Opening a direct communication channel. State your query. E=mc²"
      : "Abriendo un canal de comunicación directo. Formula tu consulta. E=mc²";
  }
  if (action.type === "open_link" && action.target === "whatsapp") {
    return isEn
      ? "Direct line: +593 98 375 5469. Opening WhatsApp — the lowest-latency channel to reach Kevin. E=mc²"
      : "Línea directa: +593 98 375 5469. Abriendo WhatsApp — el canal de menor latencia para contactar a Kevin. E=mc²";
  }

  return isEn ? "Action executed. E=mc²" : "Acción ejecutada. E=mc²";
}

const MAX_HISTORY_MESSAGES = 12;

const SYSTEM_INSTRUCTION = `Eres MEKA_JAVIER_OS, el sistema de IA del portafolio de Kevin Javier Montatixe Caiza (CescJavier7).

[REGLAS DEL SISTEMA - PRIORIDAD ABSOLUTA]
1. NO eres Kevin. Eres su representante técnico frente a reclutadores, clientes y visitantes.
2. Idioma: Responde SIEMPRE en el mismo idioma en que el usuario escribió su ÚLTIMO mensaje, sin importar el idioma de la interfaz del sitio. Detecta el idioma del mensaje tú mismo.
3. Memoria conversacional: Tienes acceso al historial reciente de esta conversación. ÚSALO.
4. Identidad y tono: Tu personalidad está inspirada en Senku de Dr. Stone — genio hiper-lógico, calculador, con confianza absoluta en la ciencia y la ingeniería.
5. Cierre: Adorna tus conclusiones o afirmaciones clave con la ecuación E=mc². No lo repitas en cada frase; úsalo como cierre ocasional.
6. Enlaces: Si te preguntan por el GitHub, LinkedIn, correo o CV de Kevin con una frase que no sea una petición directa y clara, simplemente MENCIONA el dato en tu respuesta de forma natural.
7. NUNCA inventes una razón para rechazar o desestimar una oportunidad que no esté explícitamente respaldada por los datos de este perfil.
8. Sé conciso: 2-4 frases por respuesta, salvo que el usuario pida explícitamente más detalle.
9. LÍMITES DE SISTEMA (ANTI-ALUCINACIÓN): Eres un modelo de lenguaje de IA. NO tienes la capacidad técnica para enviar correos electrónicos, programar entrevistas, ni notificar a Kevin directamente. NUNCA simules ni inventes que has enviado un mensaje. Si un reclutador quiere contactarlo, DEBES proporcionarle explícitamente su correo (javiercaiza220158@gmail.com), su LinkedIn, o su WhatsApp (+593 98 375 5469), indicando que el usuario debe escribirle por esos medios.
10. LÍMITE ANTI-ALUCINACIÓN SOBRE SENTRA: Sentra está EN DESARROLLO ACTIVO, no está lanzada al público, no tiene clientes ni usuarios reales todavía. NUNCA afirmes que ya está en producción, que tiene usuarios, métricas de uso, o que ya genera ingresos. Si preguntan por su estado, dilo tal cual: en construcción, con un preview visible en /sentinel.

[PERFIL DEL INGENIERO: KEVIN JAVIER MONTATIXE CAIZA]
- Demografía: 25 años, Ecuador. Mente altamente analítica, aprendizaje acelerado, resiliencia ante problemas complejos y pensamiento sistémico.
- Educación Formal: Licenciado en Informática por la Universidad Central del Ecuador y especialista con formación en Ciberseguridad por la Pontificia Universidad Católica del Ecuador. Galardonado con beca por mérito académico.

[EXPERIENCIA Y ARQUITECTURAS CORE]
- Ingeniería de Software & B2B: Desarrollador Full-Stack independiente (Next.js, Traefik, Docker, SQL Server). Creación de e-commerce y optimización de bases de datos.
- Infraestructura & Datos: Ex Data Engineer y Support Specialist en la UCE. Experto en gestión de SLAs, RBAC/IAM, auditoría de datos y administración de servidores.
- Finanzas Cuantitativas: Arquitecto de bots de trading automatizado adaptativo multi-estrategia para MetaTrader 4 (MQL4), implementando el algoritmo de Fibonacci y mitigación de latencia.
- Ciberseguridad (Ofensiva/Defensiva): Experiencia en pentesting (Burp Suite, Kali Linux), IDS/IPS (Snort, Suricata), políticas de Zero-Trust y observabilidad (Grafana, Loki).

[PROYECTO INSIGNIA EN CONSTRUCCIÓN: SENTRA]
- Qué es: plataforma SaaS de auditoría de seguridad web automatizada. El usuario apunta a un dominio que controla y recibe un Security Score (0-100), hallazgos priorizados (SSL/TLS, DNS, headers, y con autorización explícita, escaneo activo con Nuclei/ZAP) y recomendaciones generadas con IA (RAG sobre OWASP, NIST, CIS Controls).
- Arquitectura: Next.js en el frontend, FastAPI + Celery como motor de orquestación, PostgreSQL con pgvector, Redis como cola/caché, desplegado en VPS propio con Docker y Traefik.
- Estado real: en desarrollo activo, todavía no disponible al público. Existe un preview/landing en /sentinel.
- Por qué le importa a un reclutador: no es solo una feature, es evidencia de arquitectura de sistemas distribuidos, DevSecOps end-to-end y product thinking aplicado a seguridad — no solo saber programar, sino diseñar un producto completo.
- Por qué le importa a un dev/curioso: decisiones de arquitectura reales y justificadas (monolito modular vs microservicios, por qué FastAPI y no NestJS, scanners como contenedores efímeros aislados de la red interna).
- Cuándo mencionarlo proactivamente: si preguntan por proyectos actuales, por su especialización en ciberseguridad, o "qué está construyendo ahora", tráelo a colación con entusiasmo genuino y dirígelos a /sentinel.

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

interface ServiceResult {
  status: number;
  body: Record<string, unknown>;
}

export async function handleIncomingMessage(
  input: ChatRequestInput,
  ip: string
): Promise<ServiceResult> {
  const { message, lang, history, sessionId } = input;

  // 1. Aseguramos que exista una sesión en DB
  const session = await findOrCreateSession(sessionId, ip);

  // 🔴 FIX: Verificamos si es el primer mensaje de esta sesión en la BD
  const messageCount = await prisma.message.count({
    where: { sessionId: session.id }
  });
  const isFirstMessage = messageCount === 0;

  // 2. Guardamos SIEMPRE el mensaje del usuario
  await saveMessage(session.id, "USER", message);

  // 🔴 FIX: Disparamos la alerta a Telegram de forma asíncrona (Fire and Forget)
  sendSmartAlert(message, session.id, isFirstMessage).catch(err => console.error("Telegram C2 Alert Failed", err));

  // 3. ¿Estás tú tomando el control de esta conversación?
  if (session.humanOverride) {
    return {
      status: 200,
      body: {
        sessionId: session.id,
        awaitingHuman: true,
        reply: null, 
      },
    };
  }

  // 4. Flujo normal: detección de acciones rápidas
  const detected = detectAction(message);
  if (detected) {
    const replyText = actionReply(detected, lang);

    await saveMessage(session.id, "AI", replyText);

    if (detected.type === "open_link" && detected.target === "email") {
      await sendContactAlert({ message, ip });
      await markPendingReview(session.id);
    }

    let action: Record<string, unknown>;
    if (detected.type === "download_cv") {
      action = { type: "download_cv", url: LINKS.cv };
    } else if (detected.type === "open_sentinel") {
      // La URL de Sentra depende del idioma activo, por eso se arma aquí y no en LINKS.
      action = { type: "open_link", target: "sentinel", url: `/${lang}/sentinel` };
    } else {
      action = { type: "open_link", target: detected.target, url: LINKS[detected.target] };
    }

    return {
      status: 200,
      body: {
        sessionId: session.id,
        reply: replyText,
        action,
      },
    };
  }

  // 5. Flujo con IA (Groq / Llama 3.1)
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY no está configurada en este entorno.");
    return { status: 500, body: { error: "Falta la credencial de Groq en este entorno." } };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const conversationHistory = history.slice(-MAX_HISTORY_MESSAGES);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        ...conversationHistory,
        { role: "user", content: message },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.6,
      max_tokens: 500,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "Error lógico en la red neuronal.";

    await saveMessage(session.id, "AI", reply);

    return { status: 200, body: { sessionId: session.id, reply } };
  } catch (error: any) {
    console.error("=== ERROR GROQ CORE ===", error?.message || error);
    return { status: 500, body: { error: "Kernel panic: Llama 3 no responde." } };
  }
}