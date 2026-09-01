import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";
import { findOrCreateSession, markPendingReview } from "@/lib/repositories/chatSession.repository";
import { saveMessage } from "@/lib/repositories/message.repository";
import { sendContactAlert } from "@/lib/services/notification.service";
import { sendSmartAlert } from "@/lib/services/telegram.service"; // 🔴 FIX: Nueva integración C2
import { groqModelChain, isModelGoneError } from "@/lib/groqModels";
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
      ? "Sentra. Kevin's flagship product, live now: an automated web security platform — point it at a domain you verify by DNS and it returns a Security Score, prioritized findings mapped to OWASP/CWE/NIST, AI reports, continuous monitoring with email alerts, plus a public API and webhooks. Passive by design — it never attacks your systems. Start free, no card. Opening it now — this is architecture-level engineering. E=mc²"
      : "Sentra. El producto insignia de Kevin, ya en vivo: una plataforma de seguridad web automatizada — verificas tu dominio por DNS y devuelve un Security Score, hallazgos priorizados mapeados a OWASP/CWE/NIST, informes con IA, monitoreo continuo con alertas por correo, más API pública y webhooks. Pasivo por diseño: nunca ataca tus sistemas. Empieza gratis, sin tarjeta. Abriéndolo ahora — esto es ingeniería a nivel de arquitectura. E=mc²";
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

// La cadena de modelos con fallback vive en lib/groqModels.ts (fuente única
// compartida con el reporte IA y el sensor), para que un decomiso no deje ningún
// camino con un modelo muerto hardcodeado.

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
10. LÍMITE ANTI-ALUCINACIÓN SOBRE SENTRA: Sentra YA ESTÁ EN VIVO y es un producto real y usable en /sentinel (empieza gratis, sin tarjeta). Anímalos a probarlo. Lo que NO debes inventar: números concretos de usuarios, clientes de pago, métricas de uso o ingresos — es un lanzamiento reciente y su base de usuarios aún está creciendo. Si preguntan por tracción, sé honesto: recién lanzado, en fase de conseguir sus primeros usuarios.

[PERFIL DEL INGENIERO: KEVIN JAVIER MONTATIXE CAIZA]
- Demografía: 25 años, Ecuador. Mente altamente analítica, aprendizaje acelerado, resiliencia ante problemas complejos y pensamiento sistémico.
- Educación Formal: Licenciado en Informática por la Universidad Central del Ecuador y especialista con formación en Ciberseguridad por la Pontificia Universidad Católica del Ecuador. Galardonado con beca por mérito académico.

[EXPERIENCIA Y ARQUITECTURAS CORE]
- Ingeniería de Software & B2B: Desarrollador Full-Stack independiente (Next.js, Traefik, Docker, SQL Server). Creación de e-commerce y optimización de bases de datos.
- Infraestructura & Datos: Ex Data Engineer y Support Specialist en la UCE. Experto en gestión de SLAs, RBAC/IAM, auditoría de datos y administración de servidores.
- Finanzas Cuantitativas: Arquitecto de bots de trading automatizado adaptativo multi-estrategia para MetaTrader 4 (MQL4), implementando el algoritmo de Fibonacci y mitigación de latencia.
- Ciberseguridad (Ofensiva/Defensiva): Experiencia en pentesting (Burp Suite, Kali Linux), IDS/IPS (Snort, Suricata), políticas de Zero-Trust y observabilidad (Grafana, Loki).

[PROYECTO INSIGNIA — EN VIVO: SENTRA]
- Qué es: plataforma SaaS de auditoría y monitoreo continuo de seguridad web, YA EN PRODUCCIÓN. El usuario verifica un dominio por DNS y recibe un Security Score (0-100, nota A-F), hallazgos priorizados mapeados a OWASP/CWE/NIST, informes con IA, monitoreo continuo con alertas por correo, descubrimiento de superficie, inteligencia de exposición, API pública, webhooks y equipos con RBAC. Es 100% PASIVO por diseño: nunca ataca los sistemas del usuario, solo observa información pública (headers, TLS, DNS/SPF/DMARC, transparencia de certificados).
- Arquitectura: Next.js en el frontend; FastAPI (async, SQLAlchemy/asyncpg) como backend en api.cescjavier.dev; PostgreSQL; Redis para rate limiting; Docker + Traefik + Cloudflare; cobro manual verificado (transferencia, De Una, PayPhone, PayPal, USDT) con aprobación del fundador; Resend para correo; Groq (LLM) para los informes con IA.
- Estado real: EN VIVO y usable hoy en /sentinel. Empieza gratis, sin tarjeta. Lanzamiento reciente en fase de crecer su base de usuarios.
- Por qué le importa a un reclutador: es un SaaS completo end-to-end en producción (auth, billing, multi-tenant, RBAC, API pública, webhooks, auditoría) — evidencia de arquitectura, DevSecOps y product thinking, no solo saber programar.
- Por qué le importa a un dev/curioso: decisiones de arquitectura reales y justificadas (async FastAPI, tokens rotativos con detección de reuso, escaneo pasivo por barrera ético-legal, aislamiento anti-IDOR por organización).
- Cuándo mencionarlo proactivamente: si preguntan por proyectos actuales, por su especialización en ciberseguridad, o "qué está construyendo ahora", tráelo a colación con entusiasmo y dirígelos a /sentinel para que lo prueben.

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
  ip: string,
  sentraUser?: { userId: string; email: string }
): Promise<ServiceResult> {
  const { message, lang, history, sessionId } = input;

  // 1. Aseguramos que exista una sesión en DB (vinculada al usuario de
  // Sentra si el visitante chatea logueado — ver route.ts).
  const session = await findOrCreateSession(sessionId, ip, sentraUser);

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

  // 5. Flujo con IA (Groq / Llama 3.3)
  if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY no está configurada en este entorno.");
    return { status: 500, body: { error: "Falta la credencial de Groq en este entorno." } };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const conversationHistory = history.slice(-MAX_HISTORY_MESSAGES);

  let lastError: any = null;
  for (const model of groqModelChain()) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          ...conversationHistory,
          { role: "user", content: message },
        ],
        model,
        temperature: 0.6,
        max_tokens: 500,
      });

      const reply = chatCompletion.choices[0]?.message?.content || "Error lógico en la red neuronal.";
      await saveMessage(session.id, "AI", reply);
      return { status: 200, body: { sessionId: session.id, reply } };
    } catch (error: any) {
      lastError = error;
      const status = error?.status ?? error?.statusCode;
      const code = error?.error?.code ?? error?.code;
      const detail = error?.error?.message ?? error?.message ?? String(error);
      console.error("=== ERROR GROQ CORE ===", { model, status, code, detail });
      // Solo probamos el SIGUIENTE modelo si ESTE no existe/está decomisionado.
      // Ante 401 (key), 429 (cupo) u otros, cambiar de modelo no ayuda → cortamos.
      if (!isModelGoneError(error)) break;
    }
  }

  // Ningún modelo funcionó.
  const groqStatus = lastError?.status ?? lastError?.statusCode;
  const groqDetail = lastError?.error?.message ?? lastError?.message ?? String(lastError);
  return {
    // 400 (NO 5xx) A PROPÓSITO: Cloudflare intercepta los 5xx y les borra el
    // cuerpo → el navegador/curl recibirían vacío y no podrían leer `detail`.
    // Con 4xx el JSON con el motivo real de Groq sí llega. (Igual que payphone_billing.py.)
    status: 400,
    body: {
      error: "Kernel panic: el asistente no está disponible.",
      // `detail` NO es secreto (nombre de modelo / motivo de Groq) y es clave
      // para depurar: dice si el modelo se decomisionó o si la key es inválida.
      detail: `Groq(${groqStatus ?? "?"}): ${String(groqDetail).slice(0, 200)}`,
    },
  };
}