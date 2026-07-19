// app/api/sentra/report/route.ts
//
// Genera reportes con IA para un escaneo de Sentra. Vive en Next.js (no en
// el backend Python) para reutilizar el Groq que ya usa MekaSenku, sin
// sumar dependencias ni secretos al servicio FastAPI.
//
// Gating: valida el token de Sentra contra /auth/me y exige plan Pro+.
// Los reportes IA son una feature premium.
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { verifySentraToken } from '@/lib/sentra/verifyToken.server';

const PRO_PLANS = new Set(['PRO', 'TEAM', 'ENTERPRISE']);

interface Finding {
  label: string;
  passed: boolean;
  weight: number;
  severity: string;
  recommendation: string | null;
}

export async function POST(req: Request) {
  const user = await verifySentraToken(req.headers.get('authorization'));
  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  if (!PRO_PLANS.has(user.plan)) {
    return NextResponse.json({ error: 'Los reportes con IA son una función Pro.' }, { status: 403 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'IA no disponible en este entorno.' }, { status: 500 });
  }

  let body: { domain?: string; score?: number; grade?: string; findings?: Finding[]; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const { domain, score, grade, findings, lang } = body;
  if (!domain || typeof score !== 'number' || !Array.isArray(findings)) {
    return NextResponse.json({ error: 'Datos de escaneo incompletos.' }, { status: 400 });
  }

  const isEn = lang === 'en';
  const failed = findings.filter((f) => !f.passed);
  const passed = findings.filter((f) => f.passed);

  const findingsText = findings
    .map((f) => `- [${f.passed ? 'OK' : 'FALLA'}] ${f.label} (peso ${f.weight}, severidad ${f.severity})`)
    .join('\n');

  const totalWeight = findings.reduce((sum, f) => sum + f.weight, 0);
  const earned = passed.reduce((sum, f) => sum + f.weight, 0);

  const system = isEn
    ? `You are a senior cybersecurity analyst writing an audit report for the domain ${domain}. Base everything ONLY on the provided passive-scan findings (HTTP security headers, TLS, DNS email records). Do not invent findings. Be precise and actionable. Respond in English.`
    : `Eres un analista senior de ciberseguridad redactando un informe de auditoría para el dominio ${domain}. Básate ÚNICAMENTE en los hallazgos del escaneo pasivo provistos (cabeceras HTTP de seguridad, TLS, registros DNS de correo). No inventes hallazgos. Sé preciso y accionable. Responde en español.`;

  const prompt = isEn
    ? `Security Score: ${score}/100 (grade ${grade}). ${passed.length} checks passed, ${failed.length} failed.

Findings:
${findingsText}

Produce a JSON object with EXACTLY two string fields:
- "technical": a technical report for the engineering team. Markdown allowed. Structure it in sections:
  1. "## Scoring methodology": explain the score is a weighted sum: score = (sum of weights of passed checks) / (total weight) × 100. Here: ${earned} of ${totalWeight} points earned = ${score}/100. List each check with its weight.
  2. "## Findings & remediation": for each FAILED check, explain the risk and give a concrete remediation (with example header/DNS config).
- "executive": a short executive summary (max 120 words) in plain business language: overall posture, top risks, and business impact. No jargon.
Return ONLY the JSON, no extra text.`
    : `Security Score: ${score}/100 (nota ${grade}). ${passed.length} checks aprobados, ${failed.length} fallidos.

Hallazgos:
${findingsText}

Genera un objeto JSON con EXACTAMENTE dos campos string:
- "technical": informe técnico para el equipo de ingeniería. Se permite Markdown. Estructúralo en secciones:
  1. "## Metodología del score": explica que el score es una suma ponderada: score = (suma de pesos de los checks aprobados) / (peso total) × 100. En este caso: ${earned} de ${totalWeight} puntos = ${score}/100. Lista cada check con su peso.
  2. "## Hallazgos y remediación": para cada check FALLIDO, explica el riesgo y da una remediación concreta (con ejemplo de config de header/DNS).
- "executive": resumen ejecutivo breve (máx 120 palabras) en lenguaje de negocio: postura general, principales riesgos e impacto de negocio. Sin jerga.
Devuelve SOLO el JSON, sin texto extra.`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 1800,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      technical: String(parsed.technical ?? ''),
      executive: String(parsed.executive ?? ''),
    });
  } catch (err) {
    console.error('[SENTRA_REPORT] Groq error:', err);
    return NextResponse.json({ error: 'No se pudo generar el reporte. Inténtalo de nuevo.' }, { status: 502 });
  }
}
