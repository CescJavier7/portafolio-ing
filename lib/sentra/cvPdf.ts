// lib/sentra/cvPdf.ts
//
// Exporta un CV a PDF imprimible (→ "Guardar como PDF" del navegador). Cero
// dependencias: abre una ventana con HTML autocontenido y llama print().
//
// Seguridad (DevSecOps): el contenido del CV lo generó un LLM a partir de la
// oferta (input no confiable). TODO valor interpolado se ESCAPA antes de ir al
// HTML — el LLM nunca puede inyectar etiquetas ni scripts en la ventana.
import type { CVContent } from '@/lib/sentra/api';

export interface CVPdfLabels {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  languages: string;
  generatedBy: string;
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function openCVPdf(cv: CVContent, labels: CVPdfLabels): void {
  const chips = (items: string[]) =>
    items.map((s) => `<span class="chip">${esc(s)}</span>`).join('');

  const expHtml = cv.experience
    .map(
      (e) => `
      <div class="exp">
        <div class="exp-head">
          <strong>${esc(e.role)}</strong>${e.company ? ` · ${esc(e.company)}` : ''}
          ${e.period ? `<span class="period">${esc(e.period)}</span>` : ''}
        </div>
        ${
          e.highlights && e.highlights.length
            ? `<ul>${e.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>`
            : ''
        }
      </div>`,
    )
    .join('');

  const eduHtml = cv.education.length
    ? `<ul>${cv.education.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`
    : '';

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(cv.full_name || 'CV')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 48px 40px; line-height: 1.5; }
  h1 { font-size: 30px; margin: 0 0 2px; letter-spacing: -0.02em; }
  .headline { font-size: 15px; color: #16a34a; font-weight: 600; margin: 0 0 16px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #16a34a; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin: 28px 0 12px; }
  .summary { font-size: 14px; color: #374151; }
  .exp { margin-bottom: 14px; }
  .exp-head { font-size: 14px; }
  .period { float: right; color: #6b7280; font-size: 12px; font-weight: 500; }
  ul { margin: 6px 0 0; padding-left: 18px; }
  li { font-size: 13px; color: #374151; margin-bottom: 3px; }
  .chip { display: inline-block; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; font-size: 12px; padding: 3px 10px; border-radius: 999px; margin: 0 4px 6px 0; }
  .foot { margin-top: 36px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
  @media print { body { padding: 0; } .foot { position: fixed; bottom: 0; } }
</style></head>
<body onload="window.print()">
  <h1>${esc(cv.full_name || '')}</h1>
  ${cv.headline ? `<p class="headline">${esc(cv.headline)}</p>` : ''}
  ${cv.summary ? `<h2>${esc(labels.summary)}</h2><p class="summary">${esc(cv.summary)}</p>` : ''}
  ${expHtml ? `<h2>${esc(labels.experience)}</h2>${expHtml}` : ''}
  ${eduHtml ? `<h2>${esc(labels.education)}</h2>${eduHtml}` : ''}
  ${cv.skills.length ? `<h2>${esc(labels.skills)}</h2>${chips(cv.skills)}` : ''}
  ${cv.languages.length ? `<h2>${esc(labels.languages)}</h2>${chips(cv.languages)}` : ''}
  <div class="foot">${esc(labels.generatedBy)} — cescjavier.dev</div>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return; // popup bloqueado: el llamador muestra un aviso
  w.document.open();
  w.document.write(html);
  w.document.close();
}
