// lib/sentra/pdfReport.ts
//
// Genera un reporte imprimible (→ "Guardar como PDF" del navegador) a partir
// de un escaneo. Cero dependencias: se abre una ventana con HTML autocontenido
// y se llama print(). Funciona en desktop, móvil e iPad.
//
// Seguridad: TODO valor interpolado se escapa con escapeHtml (defensa en
// profundidad, aunque los datos vengan del backend). Solo se usan datos
// estructurados del escaneo — nunca se inyecta el texto del reporte IA sin
// sanitizar.
import type { SentraScan } from '@/lib/sentra/api';

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
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function gradeColor(grade: string): string {
  if (grade === 'A') return '#16a34a';
  if (grade === 'B') return '#65a30d';
  if (grade === 'C') return '#ca8a04';
  if (grade === 'D') return '#ea580c';
  return '#dc2626';
}

export function openScanReport(scan: SentraScan, labels: PdfLabels) {
  const color = gradeColor(scan.grade);
  const dateStr = new Date(scan.created_at).toLocaleString();

  const rows = (scan.findings ?? [])
    .map((f) => {
      const statusColor = f.passed ? '#16a34a' : '#dc2626';
      const statusText = f.passed ? labels.passed : labels.failed;
      const rec = !f.passed && f.recommendation ? escapeHtml(f.recommendation) : '';
      return `
        <tr>
          <td class="chk">
            ${escapeHtml(f.label)}
            ${rec ? `<div class="rec"><b>${escapeHtml(labels.recommendation)}:</b> ${rec}</div>` : ''}
          </td>
          <td class="num">${f.passed ? `+${f.weight}` : `0/${f.weight}`}</td>
          <td class="st" style="color:${statusColor}">${escapeHtml(statusText)}</td>
        </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(labels.reportTitle)} — ${escapeHtml(scan.domain)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 28px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
  .brand span { color: #22c55e; }
  .meta { text-align: right; font-size: 13px; color: #475569; line-height: 1.7; }
  .meta b { color: #0f172a; }
  .scorebox { display: flex; align-items: center; gap: 24px; margin-bottom: 32px; }
  .ring { width: 110px; height: 110px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
  .ring .s { font-size: 38px; font-weight: 800; line-height: 1; }
  .ring .g { font-size: 15px; font-weight: 700; }
  .scoremeta .lbl { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 700; }
  .scoremeta .dom { font-size: 20px; font-weight: 700; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.08em; color: #64748b; border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
  td { padding: 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td.num { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
  td.st { font-weight: 700; white-space: nowrap; }
  .rec { font-size: 12px; color: #475569; margin-top: 5px; line-height: 1.5; }
  .foot { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 24px; } .no-print { display: none; } }
  .btn { display: inline-block; margin: 0 0 24px; padding: 10px 20px; background: #22c55e; color: #fff; border: 0; border-radius: 999px; font-weight: 700; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
  <button class="btn no-print" onclick="window.print()">${escapeHtml(labels.reportTitle)} → PDF</button>
  <div class="head">
    <div class="brand">Sentra<span>.</span></div>
    <div class="meta">
      <div><b>${escapeHtml(labels.domain)}:</b> ${escapeHtml(scan.domain)}</div>
      <div><b>${escapeHtml(labels.date)}:</b> ${escapeHtml(dateStr)}</div>
    </div>
  </div>

  <div class="scorebox">
    <div class="ring" style="background:${color}">
      <div class="s">${scan.score}</div>
      <div class="g">${escapeHtml(scan.grade)}</div>
    </div>
    <div class="scoremeta">
      <div class="lbl">${escapeHtml(labels.scoreLabel)}</div>
      <div class="dom">${escapeHtml(scan.domain)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${escapeHtml(labels.check)}</th>
        <th>${escapeHtml(labels.weight)}</th>
        <th>${escapeHtml(labels.status)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="foot">${escapeHtml(labels.generatedBy)} — Sentra · ${escapeHtml(dateStr)}</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) return; // popup bloqueado: el llamador muestra un aviso
  w.document.open();
  w.document.write(html);
  w.document.close();
}
