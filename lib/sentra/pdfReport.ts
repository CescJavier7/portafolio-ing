// lib/sentra/pdfReport.ts
//
// Genera el INFORME imprimible (→ "Guardar como PDF" del navegador) de un
// escaneo. Cero dependencias: abre una ventana con HTML autocontenido y
// llama print(). Funciona en desktop, móvil e iPad.
//
// Seguridad (DevSecOps): TODO valor interpolado se escapa. La narrativa de
// IA (Markdown) se pasa por mdToSafeHtml, que ESCAPA primero y recién
// después aplica un subconjunto mínimo de formato — así el texto del LLM
// nunca puede inyectar HTML/script en la ventana del informe.
import type { SentraScan, SentraReport } from '@/lib/sentra/api';

export interface PdfLabels {
  reportTitle: string;
  domain: string;
  date: string;
  scoreLabel: string;
  check: string;
  weight: string;
  status: string;
  passed: string;
  failed: string;
  recommendation: string;
  generatedBy: string;
  // Secciones del informe
  executiveTitle: string;
  methodologyTitle: string;
  methodologyBody: string; // plantilla con {earned} {total} {score}
  severityHigh: string;
  severityMedium: string;
  severityLow: string;
  pointsLost: string;
  findingsTitle: string;
  prioritiesTitle: string;
  technicalTitle: string;
  aiPending: string;
  // Formalización del documento
  classification: string;   // ej. "CONFIDENCIAL"
  reportId: string;         // etiqueta "Referencia del informe"
  preparedBy: string;       // "Preparado por"
  category: string;         // "Categoría"
  frameworksNote: string;   // nota de metodología sobre marcos
  referencesTitle: string;  // "Marcos y referencias"
  disclaimer: string;       // pie legal
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Markdown → HTML SEGURO. Escapa todo primero; luego aplica solo un set
// acotado de transformaciones (encabezados, listas, negrita, código). Como
// el contenido ya viene escapado, las etiquetas que añadimos son las únicas
// que existen: imposible inyectar HTML desde la salida del modelo.
function mdToSafeHtml(md: string): string {
  const esc = escapeHtml(md);
  const inline = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const lines = esc.split('\n');
  let html = '';
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) {
      html += `</${list}>`;
      list = null;
    }
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) {
      closeList();
      continue;
    }
    if (/^#{1,6}\s+/.test(t)) {
      closeList();
      html += `<h3>${inline(t.replace(/^#{1,6}\s+/, ''))}</h3>`;
    } else if (/^\d+\.\s+/.test(t)) {
      if (list !== 'ol') {
        closeList();
        html += '<ol>';
        list = 'ol';
      }
      html += `<li>${inline(t.replace(/^\d+\.\s+/, ''))}</li>`;
    } else if (/^[-*]\s+/.test(t)) {
      if (list !== 'ul') {
        closeList();
        html += '<ul>';
        list = 'ul';
      }
      html += `<li>${inline(t.replace(/^[-*]\s+/, ''))}</li>`;
    } else {
      closeList();
      html += `<p>${inline(t)}</p>`;
    }
  }
  closeList();
  return html;
}

function gradeColor(grade: string): string {
  if (grade === 'A') return '#16a34a';
  if (grade === 'B') return '#65a30d';
  if (grade === 'C') return '#ca8a04';
  if (grade === 'D') return '#ea580c';
  return '#dc2626';
}

export function openScanReport(scan: SentraScan, labels: PdfLabels, ai?: SentraReport | null) {
  const color = gradeColor(scan.grade);
  const dateStr = new Date(scan.created_at).toLocaleString();
  const findings = scan.findings ?? [];

  const total = findings.reduce((s, f) => s + f.weight, 0);
  const earned = findings.filter((f) => f.passed).reduce((s, f) => s + f.weight, 0);
  const lost = (sev: string) => findings.filter((f) => !f.passed && f.severity === sev).reduce((s, f) => s + f.weight, 0);

  const methodology = escapeHtml(labels.methodologyBody)
    .replace('{earned}', String(earned))
    .replace('{total}', String(total))
    .replace('{score}', String(scan.score));

  const rows = findings
    .map((f) => {
      const statusColor = f.passed ? '#16a34a' : '#dc2626';
      const statusText = f.passed ? labels.passed : labels.failed;
      const rec = !f.passed && f.recommendation ? escapeHtml(f.recommendation) : '';
      const cat = f.category ? `<div class="cat">${escapeHtml(f.category)}</div>` : '';
      const tags = (f.references ?? [])
        .map((r) => `<span class="tag">${escapeHtml(r.framework)} ${escapeHtml(r.ref)}</span>`)
        .join('');
      return `
        <tr>
          <td class="chk">
            ${escapeHtml(f.label)}
            ${cat}
            ${rec ? `<div class="rec"><b>${escapeHtml(labels.recommendation)}:</b> ${rec}</div>` : ''}
            ${tags ? `<div class="tags">${tags}</div>` : ''}
          </td>
          <td class="num">${f.passed ? `+${f.weight}` : `0/${f.weight}`}</td>
          <td class="st" style="color:${statusColor}">${escapeHtml(statusText)}</td>
        </tr>`;
    })
    .join('');

  // Referencias únicas citadas en todo el informe (sección formal, estilo bibliografía).
  const seen = new Set<string>();
  const uniqueRefs: { framework: string; ref: string; title: string }[] = [];
  for (const f of findings) {
    for (const r of f.references ?? []) {
      const key = `${r.framework}|${r.ref}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRefs.push(r);
      }
    }
  }
  uniqueRefs.sort((a, b) => a.framework.localeCompare(b.framework) || a.ref.localeCompare(b.ref));
  const referencesHtml = uniqueRefs
    .map((r) => `<li><span class="refkey">${escapeHtml(r.framework)} ${escapeHtml(r.ref)}</span> — ${escapeHtml(r.title)}</li>`)
    .join('');

  // Identificador del informe: derivado del id del escaneo (trazable, no secreto).
  const reportRef = `SEN-${scan.id.slice(0, 8).toUpperCase()}`;

  const aiSection = (title: string, md: string) =>
    md.trim() ? `<section class="rich"><h2>${escapeHtml(title)}</h2>${mdToSafeHtml(md)}</section>` : '';

  const aiBlocks = ai
    ? aiSection(labels.executiveTitle, ai.executive) +
      aiSection(labels.prioritiesTitle, ai.priorities) +
      aiSection(labels.technicalTitle, ai.technical)
    : `<section class="rich"><p class="pending">${escapeHtml(labels.aiPending)}</p></section>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(labels.reportTitle)} — ${escapeHtml(scan.domain)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#0f172a; margin:0; padding:44px; line-height:1.6; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #22c55e; padding-bottom:20px; margin-bottom:28px; }
  .brand { font-size:22px; font-weight:800; letter-spacing:-.02em; }
  .brand span { color:#22c55e; }
  .brand .sub { display:block; font-size:11px; font-weight:600; color:#64748b; letter-spacing:.02em; margin-top:2px; }
  .meta { text-align:right; font-size:13px; color:#475569; line-height:1.7; }
  .meta b { color:#0f172a; }
  .scorebox { display:flex; align-items:center; gap:24px; margin-bottom:28px; }
  .ring { width:104px; height:104px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#fff; }
  .ring .s { font-size:36px; font-weight:800; line-height:1; }
  .ring .g { font-size:14px; font-weight:700; }
  .scoremeta .lbl { font-size:12px; text-transform:uppercase; letter-spacing:.1em; color:#64748b; font-weight:700; }
  .scoremeta .dom { font-size:20px; font-weight:700; margin-top:4px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.06em; color:#0f172a; border-bottom:1px solid #e2e8f0; padding-bottom:8px; margin:30px 0 14px; }
  .method { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px 18px; font-size:13px; }
  .method .formula { font-family:ui-monospace,Menlo,monospace; background:#0f172a; color:#e2e8f0; padding:8px 12px; border-radius:6px; display:inline-block; margin:8px 0; font-size:12.5px; }
  .sev { display:flex; gap:18px; flex-wrap:wrap; margin-top:8px; font-size:12px; }
  .sev b { font-variant-numeric:tabular-nums; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; text-transform:uppercase; font-size:10px; letter-spacing:.08em; color:#64748b; border-bottom:1px solid #e2e8f0; padding:8px 10px; }
  td { padding:10px; border-bottom:1px solid #f1f5f9; vertical-align:top; }
  td.num { font-variant-numeric:tabular-nums; font-weight:700; white-space:nowrap; }
  td.st { font-weight:700; white-space:nowrap; }
  .rec { font-size:12px; color:#475569; margin-top:5px; line-height:1.5; }
  .cat { font-size:11px; color:#94a3b8; margin-top:3px; font-weight:600; }
  .tags { margin-top:6px; display:flex; flex-wrap:wrap; gap:4px; }
  .tag { font-family:ui-monospace,Menlo,monospace; font-size:10px; font-weight:700; color:#475569; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:4px; padding:1px 6px; }
  .class { display:inline-block; font-family:ui-monospace,Menlo,monospace; font-size:10px; font-weight:700; letter-spacing:.1em; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:4px; padding:2px 8px; margin-bottom:8px; }
  .refs { list-style:none; padding:0; margin:0; font-size:12.5px; color:#475569; }
  .refs li { padding:6px 0; border-bottom:1px solid #f1f5f9; }
  .refs .refkey { font-family:ui-monospace,Menlo,monospace; font-weight:700; color:#0f172a; }
  .disc { margin-top:10px; font-size:10.5px; color:#94a3b8; line-height:1.5; }
  .rich { font-size:13.5px; color:#1e293b; }
  .rich h3 { font-size:14px; margin:16px 0 6px; color:#0f172a; }
  .rich p { margin:0 0 10px; }
  .rich ul,.rich ol { margin:0 0 12px; padding-left:22px; }
  .rich li { margin-bottom:6px; }
  .rich code { font-family:ui-monospace,Menlo,monospace; background:#f1f5f9; padding:1px 5px; border-radius:4px; font-size:12px; }
  .rich strong { color:#0f172a; }
  .pending { color:#94a3b8; font-style:italic; }
  .foot { margin-top:36px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; }
  .btn { display:inline-block; margin:0 0 24px; padding:10px 20px; background:#22c55e; color:#fff; border:0; border-radius:999px; font-weight:700; font-size:14px; cursor:pointer; }
  @media print { body { padding:24px; } .no-print { display:none; } h2,h3 { page-break-after:avoid; } tr,li { page-break-inside:avoid; } }
</style>
</head>
<body>
  <button class="btn no-print" onclick="window.print()">${escapeHtml(labels.reportTitle)} → PDF</button>
  <span class="class">${escapeHtml(labels.classification)}</span>
  <div class="head">
    <div class="brand">Sentra<span>.</span><span class="sub">${escapeHtml(labels.reportTitle)}</span></div>
    <div class="meta">
      <div><b>${escapeHtml(labels.domain)}:</b> ${escapeHtml(scan.domain)}</div>
      <div><b>${escapeHtml(labels.date)}:</b> ${escapeHtml(dateStr)}</div>
      <div><b>${escapeHtml(labels.reportId)}:</b> ${escapeHtml(reportRef)}</div>
      <div><b>${escapeHtml(labels.preparedBy)}:</b> Sentra Security Intelligence</div>
    </div>
  </div>

  <div class="scorebox">
    <div class="ring" style="background:${color}"><div class="s">${scan.score}</div><div class="g">${escapeHtml(scan.grade)}</div></div>
    <div class="scoremeta"><div class="lbl">${escapeHtml(labels.scoreLabel)}</div><div class="dom">${escapeHtml(scan.domain)}</div></div>
  </div>

  ${ai && ai.executive.trim() ? `<section class="rich"><h2>${escapeHtml(labels.executiveTitle)}</h2>${mdToSafeHtml(ai.executive)}</section>` : ''}

  <h2>${escapeHtml(labels.methodologyTitle)}</h2>
  <div class="method">
    <div>${methodology}</div>
    <div class="formula">score = ${earned} / ${total} × 100 = ${scan.score}</div>
    <div class="sev">
      <span>${escapeHtml(labels.pointsLost)} — ${escapeHtml(labels.severityHigh)}: <b>${lost('alta')}</b></span>
      <span>${escapeHtml(labels.severityMedium)}: <b>${lost('media')}</b></span>
      <span>${escapeHtml(labels.severityLow)}: <b>${lost('baja')}</b></span>
    </div>
    <div class="disc">${escapeHtml(labels.frameworksNote)}</div>
  </div>

  <h2>${escapeHtml(labels.findingsTitle)}</h2>
  <table>
    <thead><tr><th>${escapeHtml(labels.check)}</th><th>${escapeHtml(labels.weight)}</th><th>${escapeHtml(labels.status)}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  ${ai ? aiSection(labels.prioritiesTitle, ai.priorities) + aiSection(labels.technicalTitle, ai.technical) : aiBlocks}

  ${referencesHtml ? `<h2>${escapeHtml(labels.referencesTitle)}</h2><ul class="refs">${referencesHtml}</ul>` : ''}

  <div class="foot">
    ${escapeHtml(labels.generatedBy)} — Sentra · ${escapeHtml(reportRef)} · ${escapeHtml(dateStr)}
    <div class="disc">${escapeHtml(labels.disclaimer)}</div>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return; // popup bloqueado: el llamador muestra un aviso
  w.document.open();
  w.document.write(html);
  w.document.close();
}
