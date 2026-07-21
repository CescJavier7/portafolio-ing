// app/api/sentra/report/route.ts
//
// Genera el INFORME con IA de un escaneo de Sentra. Vive en Next.js (no en
// el backend Python) para reutilizar el Groq que ya usa MekaSenku, sin
// sumar dependencias ni secretos al servicio FastAPI.
//
// Gating: valida el token de Sentra contra /auth/me y exige plan Pro+.
// El informe es una feature premium: redactado como documento de auditoría,
// con foco en impacto de negocio (lo que importa a dirección/inversores).
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
  category?: string | null;
  references?: { framework: string; ref: string; title: string }[];
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
  const totalWeight = findings.reduce((s, f) => s + f.weight, 0);
  const earned = passed.reduce((s, f) => s + f.weight, 0);
  const lostBySeverity = ['alta', 'media', 'baja'].map((sev) => ({
    sev,
    lost: failed.filter((f) => f.severity === sev).reduce((s, f) => s + f.weight, 0),
  }));

  const findingsText = findings
    .map((f) => {
      const refs = (f.references ?? []).map((r) => `${r.framework} ${r.ref}`).join(', ');
      const cat = f.category ? ` · ${f.category}` : '';
      return `- [${f.passed ? 'OK +' + f.weight : 'FALLA -' + f.weight}] ${f.label} (severidad ${f.severity}${cat})${refs ? ` · marcos: ${refs}` : ''}`;
    })
    .join('\n');

  const system = isEn
    ? `You are a principal security consultant and vCISO writing a formal audit report for the domain ${domain}, addressed to both an engineering team and a non-technical board/investors. Base EVERYTHING strictly on the provided passive external-scan findings (HTTP security headers, TLS certificate, DNS email records: SPF/DMARC). Never invent findings, CVEs, IPs or data you were not given. Translate every technical gap into concrete BUSINESS consequences (brand/reputation, customer trust, phishing/impersonation exposure, data-exposure liability, compliance signaling, revenue risk). Be precise, senior, and decisive. Write in professional English.`
    : `Eres un consultor principal de seguridad y vCISO que redacta un informe formal de auditoría para el dominio ${domain}, dirigido a la vez a un equipo de ingeniería y a un directorio/inversores no técnicos. Básate ESTRICTAMENTE en los hallazgos del escaneo externo pasivo provistos (cabeceras HTTP de seguridad, certificado TLS, registros DNS de correo: SPF/DMARC). Nunca inventes hallazgos, CVEs, IPs ni datos que no te dieron. Traduce cada brecha técnica en CONSECUENCIAS DE NEGOCIO concretas (marca/reputación, confianza del cliente, exposición a phishing/suplantación, responsabilidad por exposición de datos, señal de cumplimiento, riesgo de ingresos). Sé preciso, senior y resolutivo. Redacta en español profesional.`;

  const dataBlock = isEn
    ? `Domain: ${domain}
Security Score: ${score}/100 (grade ${grade}) — computed as a weighted sum: score = earned_weight / total_weight × 100 = ${earned}/${totalWeight} × 100.
Checks passed: ${passed.length} · failed: ${failed.length}.
Weight lost by severity: high=${lostBySeverity[0].lost}, medium=${lostBySeverity[1].lost}, low=${lostBySeverity[2].lost}.

Findings:
${findingsText}`
    : `Dominio: ${domain}
Security Score: ${score}/100 (nota ${grade}) — calculado como suma ponderada: score = peso_obtenido / peso_total × 100 = ${earned}/${totalWeight} × 100.
Checks aprobados: ${passed.length} · fallidos: ${failed.length}.
Peso perdido por severidad: alta=${lostBySeverity[0].lost}, media=${lostBySeverity[1].lost}, baja=${lostBySeverity[2].lost}.

Hallazgos:
${findingsText}`;

  const instructions = isEn
    ? `Produce a JSON object with EXACTLY these three Markdown string fields, each substantial and detailed:

- "executive": Executive summary for leadership/investors (150–220 words). State the overall security posture, quantify exposure in plain business terms, and name the single most material business risk right now. No jargon; a board member must understand it.

- "priorities": A prioritized decision plan titled around business impact. Rank the failed checks by business risk (not just technical weight), and for the top items give: the critical asset/business function at stake, the concrete threat scenario (e.g. email spoofing → phishing of your customers → brand damage), the estimated effort (low/med/high), and the score points recovered if fixed. Use a numbered list. This section must help a decision-maker choose what to fund first.

- "technical": Detailed technical report for engineers. Sections: "## Scoring methodology" (explain the weighted formula and list every check with its weight, earned vs lost). "## Detailed findings" (for EACH failed check: cite the industry framework it maps to — the OWASP/CWE/NIST references are provided in the data, use them verbatim — then risk, exploitation scenario, and a concrete remediation with an example header value or DNS record). "## Verified controls" (briefly list what passed and why it matters).

Return ONLY the JSON object.`
    : `Genera un objeto JSON con EXACTAMENTE estos tres campos string en Markdown, cada uno sustancial y detallado:

- "executive": Resumen ejecutivo para dirección/inversores (150–220 palabras). Expón la postura de seguridad general, cuantifica la exposición en términos de negocio claros, y nombra el riesgo de negocio MÁS material ahora mismo. Sin jerga; un miembro del directorio debe entenderlo.

- "priorities": Plan de decisión priorizado orientado a impacto de negocio. Ordena los checks fallidos por riesgo de negocio (no solo por peso técnico), y para los principales indica: el activo crítico / función de negocio en juego, el escenario de amenaza concreto (ej. suplantación de correo → phishing a tus clientes → daño de marca), el esfuerzo estimado (bajo/medio/alto), y los puntos de score que se recuperan al corregirlo. Usa lista numerada. Esta sección debe ayudar a un tomador de decisiones a elegir qué financiar primero.

- "technical": Informe técnico detallado para ingeniería. Secciones: "## Metodología del score" (explica la fórmula ponderada y lista cada check con su peso, obtenido vs perdido). "## Hallazgos detallados" (para CADA check fallido: cita el marco de la industria al que corresponde — las referencias OWASP/CWE/NIST vienen en los datos, úsalas literalmente — luego el riesgo, el escenario de explotación, y una remediación concreta con ejemplo de valor de header o registro DNS). "## Controles verificados" (lista breve de lo que pasó y por qué importa).

Devuelve SOLO el objeto JSON.`;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `${dataBlock}\n\n${instructions}` },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.45,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    return NextResponse.json({
      executive: String(parsed.executive ?? ''),
      priorities: String(parsed.priorities ?? ''),
      technical: String(parsed.technical ?? ''),
    });
  } catch (err) {
    console.error('[SENTRA_REPORT] Groq error:', err);
    return NextResponse.json({ error: 'No se pudo generar el informe. Inténtalo de nuevo.' }, { status: 502 });
  }
}
