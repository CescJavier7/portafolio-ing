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
  certifications: string;
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

  const eduList = (cv.education ?? []).filter((e) => e.degree.trim() || e.institution.trim());
  const eduHtml = eduList.length
    ? `<ul>${eduList
        .map((e) => {
          const inst = e.institution.trim() ? ` — ${esc(e.institution.trim())}` : '';
          const per = e.period.trim() ? ` (${esc(e.period.trim())})` : '';
          return `<li>${esc(e.degree.trim())}${inst}${per}</li>`;
        })
        .join('')}</ul>`
    : '';

  // Habilidades por categoría: "Categoría: item · item".
  const skillGroups = (cv.skills ?? [])
    .map((g) => ({ category: g.category, items: g.items.filter((i) => i.trim()) }))
    .filter((g) => g.items.length > 0 || g.category.trim());
  const skillsHtml = skillGroups
    .map((g) => {
      const cat = g.category.trim() ? `<strong>${esc(g.category.trim())}:</strong> ` : '';
      return `<p class="tags">${cat}${g.items.map((i) => esc(i.trim())).join('  ·  ')}</p>`;
    })
    .join('');

  const langList = (cv.languages ?? []).filter((l) => l.language.trim());
  const langsHtml = langList.length
    ? `<p class="tags">${langList
        .map((l) => esc(l.level.trim() ? `${l.language.trim()} (${l.level.trim()})` : l.language.trim()))
        .join('  ·  ')}</p>`
    : '';

  const certList = (cv.certifications ?? []).filter((c) => c.name.trim());
  const certHtml = certList.length
    ? `<ul>${certList
        .map((c) => {
          const issuer = c.issuer.trim() ? ` — ${esc(c.issuer.trim())}` : '';
          const year = c.year.trim() ? ` (${esc(c.year.trim())})` : '';
          return `<li>${esc(c.name.trim())}${issuer}${year}</li>`;
        })
        .join('')}</ul>`
    : '';

  // Fila de contacto (cabecera). Correo y web como <a> para que los ATS
  // extraigan los hipervínculos de forma nativa. Todo escapado antes de ir al DOM.
  const ct = cv.contact;
  const web = (ct?.website || '').trim();
  const webHref = web ? (/^https?:\/\//i.test(web) ? web : `https://${web}`) : '';
  const contactParts: string[] = [];
  if ((ct?.location || '').trim()) contactParts.push(esc(ct.location.trim()));
  if ((ct?.email || '').trim())
    contactParts.push(`<a href="mailto:${esc(ct.email.trim())}">${esc(ct.email.trim())}</a>`);
  if ((ct?.phone || '').trim()) contactParts.push(esc(ct.phone.trim()));
  if (web) contactParts.push(`<a href="${esc(webHref)}" target="_blank" rel="noopener noreferrer">${esc(web)}</a>`);
  const contactHtml = contactParts.length
    ? `<p class="contact">${contactParts.join(' <span class="sep">|</span> ')}</p>`
    : '';

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(cv.full_name || 'CV')}</title>
<style>
  /* @page margin:0 ELIMINA los artefactos del navegador (about:blank, fecha,
     título) que se dibujan en el margen físico de la hoja. El margen seguro se
     recupera con el padding del body en @media print (abajo). */
  @page { size: A4; margin: 0; }
  /* Estilo Harvard: sobrio, gris/negro, líneas finas. Sin verde ni chips. */
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; max-width: 800px; margin: 0 auto; padding: 48px 40px; line-height: 1.5; overflow-wrap: break-word; word-wrap: break-word; }
  h1 { font-size: 28px; margin: 0 0 2px; letter-spacing: -0.02em; color: #111827; }
  .headline { font-size: 14px; color: #4b5563; font-weight: 500; margin: 0 0 4px; }
  .contact { font-size: 12px; color: #6b7280; margin: 0 0 18px; overflow-wrap: break-word; }
  .contact a { color: #6b7280; text-decoration: none; }
  .contact .sep { color: #d1d5db; margin: 0 6px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #374151; border-bottom: 1px solid #d1d5db; padding-bottom: 5px; margin: 24px 0 10px; }
  .summary { font-size: 13.5px; color: #1f2937; white-space: pre-wrap; overflow-wrap: break-word; }
  .exp { margin-bottom: 13px; }
  .exp-head { font-size: 14px; overflow-wrap: break-word; }
  .exp-head strong { color: #111827; }
  .period { float: right; color: #6b7280; font-size: 12px; font-weight: 500; }
  ul { margin: 5px 0 0; padding-left: 18px; }
  li { font-size: 13px; color: #1f2937; margin-bottom: 3px; overflow-wrap: break-word; }
  .tags { font-size: 13px; color: #1f2937; overflow-wrap: break-word; }
  .foot { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
  /* En impresión el margen de página es 0 (para matar los artefactos del
     navegador), así que el margen seguro lo pone el PADDING del body. El footer
     pasa a flujo normal (static) para respetar ese padding y no rozar el borde. */
  @media print {
    html, body { margin: 0; }
    body { padding: 16mm 15mm; max-width: none; }
    .foot { position: static; }
  }
</style></head>
<body>
  <h1>${esc(cv.full_name || '')}</h1>
  ${cv.headline ? `<p class="headline">${esc(cv.headline)}</p>` : ''}
  ${contactHtml}
  ${cv.summary ? `<h2>${esc(labels.summary)}</h2><p class="summary">${esc(cv.summary)}</p>` : ''}
  ${expHtml ? `<h2>${esc(labels.experience)}</h2>${expHtml}` : ''}
  ${eduHtml ? `<h2>${esc(labels.education)}</h2>${eduHtml}` : ''}
  ${certHtml ? `<h2>${esc(labels.certifications)}</h2>${certHtml}` : ''}
  ${skillsHtml ? `<h2>${esc(labels.skills)}</h2>${skillsHtml}` : ''}
  ${langsHtml ? `<h2>${esc(labels.languages)}</h2>${langsHtml}` : ''}
  <div class="foot">${esc(labels.generatedBy)} — cescjavier.dev</div>
</body></html>`;

  // Imprimir desde un IFRAME OCULTO en vez de abrir una pestaña nueva. Ventajas:
  //  · No consume un "pop-up" → no colisiona con el window.open de Gmail (el bug
  //    del flujo de correo). Solo queda una ventana emergente: la del correo.
  //  · No hay pestaña about:blank molesta; el diálogo de impresión sale directo.
  //  · Sigue siendo un PDF REAL con texto seleccionable e hipervínculos (ATS).
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  const cleanup = () => {
    if (iframe.parentNode) iframe.remove();
  };
  if (win) {
    win.onafterprint = cleanup; // quita el iframe al cerrar el diálogo
    // Pequeño margen para que el layout del iframe se asiente antes de imprimir.
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
      }
    }, 200);
  }
  // Red de seguridad: si onafterprint no dispara en algún navegador, no dejamos
  // el iframe colgado para siempre.
  setTimeout(cleanup, 120000);
}
