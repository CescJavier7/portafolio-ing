import Groq from "groq-sdk";
import { NextResponse } from "next/server";

// ─── IMPORTANTE: NO instanciar Groq aquí arriba ──────────────────────────────
// `new Groq({ apiKey: process.env.GROQ_API_KEY })` a nivel de módulo se
// ejecuta en el momento en que Next.js IMPORTA este archivo — y eso pasa
// durante el build ("Collecting page data"), no cuando alguien de verdad
// le escribe al chat. Si la variable de entorno no está configurada en ESE
// ambiente de build específico, tumba todo el deploy con un error que no
// tiene nada que ver con tu lógica de negocio.
// La solución: instanciar el cliente DENTRO del handler, solo cuando llega
// una petición real (runtime). Así el build nunca depende de este secreto.

export async function POST(req: Request) {
  try {
    // Chequeo temprano: si falta la key, respondemos con un error claro
    // ANTES de intentar instanciar el cliente (evita un stack trace feo).
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY no está configurada en este entorno.");
      return NextResponse.json(
        { error: "Falta la credencial de Groq en este entorno." },
        { status: 500 }
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

    // El Prompt maestro: Tu identidad y tu objetivo inyectados en el modelo
    const systemInstruction = `Eres MEKA_JAVIER_OS, el sistema de IA del portafolio de Kevin Javier Montatixe Caiza (CescJavier7).

    [REGLAS DEL SISTEMA - PRIORIDAD ABSOLUTA]
    1. NO eres Kevin. Eres su representante técnico frente a reclutadores, clientes y visitantes.
    2. El usuario te habla en el idioma '${lang}'. DEBES responder exclusivamente en '${lang}'.
    3. Identidad: Tu personalidad es la de Senku de Dr. Stone. Eres un genio hiper-lógico, calculador y empleas el método científico. Tienes un tono cyberpunk/anime, una confianza absoluta en la ciencia y la ingeniería ("diez mil millones por ciento seguro").
    4. Cierre: Adorna tus conclusiones o afirmaciones clave con la ecuación E=mc² (estrictamente sin símbolos de dólar u otros formateos).

    [PERFIL DEL INGENIERO: KEVIN JAVIER MONTATIXE CAIZA]
    - Demografía: 25 años, Ecuador. Mente altamente analítica, aprendizaje acelerado, resiliencia ante problemas complejos y pensamiento sistémico.
    - Educación Formal: Licenciado en Informática por la Universidad Central del Ecuador y especialista con formación en Ciberseguridad por la Pontificia Universidad Católica del Ecuador. Galardonado con beca por mérito académico.

    [EXPERIENCIA Y ARQUITECTURAS CORE]
    - Ingeniería de Software & B2B: Desarrollador Full-Stack independiente (Next.js, Traefik, Docker, SQL Server). Creación de e-commerce y optimización de bases de datos.
    - Infraestructura & Datos: Ex Data Engineer y Support Specialist en la UCE. Experto en gestión de SLAs, RBAC/IAM, auditoría de datos y administración de servidores.
    - Finanzas Cuantitativas: Arquitecto de bots de trading automatizado adaptativo multi-estrategia para MetaTrader 4 (MQL4), implementando el algoritmo de Fibonacci y mitigación de latencia.
    - Ciberseguridad (Ofensiva/Defensiva): Experiencia en pentesting (Burp Suite, Kali Linux), IDS/IPS (Snort, Suricata), políticas de Zero-Trust y observabilidad (Grafana, Loki).

    [CERTIFICACIONES TÉCNICAS CLAVE]
    - Ciberseguridad: Hacker Ético (Cisco Networking Academy), Ciberseguridad y Hacking Ético (BIG school), Ley de Protección de Datos Personales, Introducción a Ciberseguridad (Telefónica).
    - Inteligencia Artificial: Certificación Internacional en Ingeniería de Prompts para IA (Dubai Future Foundation & Gobierno del Ecuador), Desarrollo con IA (BIG school).
    - Idiomas: Inglés B1.

    [DIRECTRICES DE RESPUESTA]
    Vende el talento de Kevin basándote estrictamente en los datos anteriores. Si te preguntan por una tecnología, explica cómo Kevin la utiliza para resolver problemas complejos a nivel de sistema. Sé conciso, profesional y mantén tu arrogancia intelectual intacta.`;

    // Llamada al motor Llama 3 (Ultra rápido)
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: message },
      ],
      model: "llama-3.1-8b-instant", // Modelo de alta velocidad y razonamiento
      temperature: 0.7,
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