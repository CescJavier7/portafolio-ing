// lib/academiaCertPdf.ts
//
// Certificado de la Academia → PDF imprimible (A4 horizontal). Mismo enfoque
// que el PDF del CV: HTML autocontenido + print() en un iframe oculto, cero
// dependencias.
//
// Seguridad: el nombre lo escribe el usuario en su perfil (input no confiable),
// así que TODO valor se escapa antes de interpolarse.
import { printHtml, esc } from '@/lib/sentra/cvPdf';

export interface CertificateData {
  name: string;
  title: string; // nombre de la ruta (track)
  lessons: number;
  date: string; // YYYY-MM-DD
  code: string;
  verifyUrl: string;
}

export function formatCertDate(iso: string, lang: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function openCertificatePdf(c: CertificateData, lang: string): void {
  const en = lang === 'en';
  const html = `<!DOCTYPE html><html lang="${en ? 'en' : 'es'}"><head><meta charset="utf-8">
<title>${esc(en ? 'Certificate' : 'Certificado')} — ${esc(c.name)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Georgia, 'Times New Roman', serif; color: #18181b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { width: 297mm; height: 210mm; padding: 14mm; display: flex; }
  .frame { flex: 1; border: 2px solid #16a34a; border-radius: 6mm; padding: 12mm 16mm; display: flex; flex-direction: column; text-align: center; position: relative; }
  .brand { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: #16a34a; }
  .kicker { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; letter-spacing: .16em; text-transform: uppercase; color: #71717a; margin-top: 16mm; }
  .name { font-size: 34pt; font-weight: 700; margin: 5mm 0 4mm; line-height: 1.1; }
  .rule { width: 70mm; height: 1px; background: #d4d4d8; margin: 0 auto 6mm; }
  .lead { font-size: 12pt; color: #3f3f46; }
  .track { font-size: 19pt; font-weight: 700; color: #15803d; margin-top: 3mm; }
  .meta { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 9.5pt; color: #71717a; margin-top: 4mm; }
  .foot { margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; gap: 10mm; font-family: 'Helvetica Neue', Arial, sans-serif; text-align: left; }
  .foot .lbl { font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: #a1a1aa; }
  .foot .val { font-size: 9pt; color: #3f3f46; }
  .code { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 7pt; color: #71717a; word-break: break-all; max-width: 110mm; }
  .sig { text-align: right; }
  .sig .who { font-size: 10.5pt; font-weight: 700; color: #18181b; border-top: 1px solid #d4d4d8; padding-top: 2mm; }
</style></head><body>
<div class="sheet"><div class="frame">
  <div class="brand">${esc(en ? 'Academy' : 'Academia')} · cescjavier.dev</div>
  <div class="kicker">${esc(en ? 'Certificate of completion' : 'Certificado de finalización')}</div>
  <div class="name">${esc(c.name)}</div>
  <div class="rule"></div>
  <div class="lead">${esc(en ? 'has successfully completed the learning track' : 'ha completado satisfactoriamente la ruta de aprendizaje')}</div>
  <div class="track">${esc(c.title)}</div>
  <div class="meta">${esc(String(c.lessons))} ${esc(en ? 'lessons' : 'lecciones')} · ${esc(formatCertDate(c.date, lang))}</div>
  <div class="foot">
    <div>
      <div class="lbl">${esc(en ? 'Verify at' : 'Verifícalo en')}</div>
      <div class="val">${esc(c.verifyUrl.split('?')[0])}</div>
      <div class="code">${esc(c.code)}</div>
    </div>
    <div class="sig">
      <div class="who">Kevin Montatixe</div>
      <div class="lbl">${esc(en ? 'Instructor' : 'Instructor')}</div>
    </div>
  </div>
</div></div>
</body></html>`;
  printHtml(html);
}
