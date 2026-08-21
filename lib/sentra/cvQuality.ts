// lib/sentra/cvQuality.ts
// Análisis DETERMINISTA del CV (sin IA, cliente): cobertura ATS de los requisitos
// y chequeos de calidad. Lógica pura y testeable, fuera del componente.
import type { CVContent } from '@/lib/sentra/api';

const STOP = new Set([
  'de', 'la', 'el', 'los', 'las', 'y', 'o', 'en', 'con', 'para', 'a', 'un', 'una', 'del', 'al',
  'the', 'and', 'or', 'of', 'to', 'in', 'with', 'for', 'as', 'on',
  'experiencia', 'experience', 'años', 'year', 'years', 'conocimiento', 'conocimientos',
  'manejo', 'nivel', 'plus', 'deseable', 'valorable', 'req', 'requisito', 'requisitos',
]);

function tokens(s: string): string[] {
  return (String(s || '').toLowerCase().match(/[a-záéíóúñ0-9+#.]+/g) || []).filter(
    (t) => t.length > 1 && !STOP.has(t),
  );
}

/** Blob de texto (minúsculas) con TODO el CV, para comprobar cobertura de keywords. */
export function cvText(c: CVContent): string {
  const parts: string[] = [c.headline, c.summary];
  for (const g of c.skills ?? []) {
    parts.push(g.category, ...g.items);
  }
  for (const e of c.experience ?? []) {
    parts.push(e.role, e.company, ...e.highlights);
  }
  for (const cert of c.certifications ?? []) parts.push(cert.name);
  for (const l of c.languages ?? []) parts.push(l.language);
  return parts.join(' ').toLowerCase();
}

export interface ATSItem {
  requirement: string;
  covered: boolean;
}

/**
 * Para cada requisito que la generación marcó como NO cubierto, re-verifica si el
 * CV ACTUAL (tras las ediciones del usuario) ya lo cubre. Un requisito se considera
 * cubierto si ≥60% de sus tokens significativos aparecen en el CV.
 */
export function atsCoverage(c: CVContent): ATSItem[] {
  const text = cvText(c);
  return (c.missing_requirements ?? []).map((req) => {
    const toks = tokens(req);
    if (toks.length === 0) return { requirement: req, covered: false };
    const hits = toks.filter((t) => text.includes(t)).length;
    return { requirement: req, covered: hits / toks.length >= 0.6 };
  });
}

export interface QualityCheck {
  code: 'metrics' | 'summary' | 'contact' | 'bullets' | 'weakverbs' | 'skills';
  level: 'good' | 'warn';
  value: number;
}

// Arranques débiles/pasivos de bullet (ES/EN): restan impacto en un CV.
const WEAK_STARTS = [
  /^responsible for\b/i,
  /^worked on\b/i,
  /^helped\b/i,
  /^encargad[oa] de\b/i,
  /^ayud[eé] a\b/i,
  /^particip[eé]\b/i,
  /^apoy[eé]\b/i,
  /^colabor[eé]\b/i,
];

/** Chequeos deterministas de calidad. `value` es el dato que el frontend formatea. */
export function cvQualityChecks(c: CVContent): QualityCheck[] {
  const highlights = (c.experience ?? []).flatMap((e) => (e.highlights ?? []).filter((h) => h.trim()));
  const withNum = highlights.filter((h) => /\d/.test(h)).length;
  const pctNum = highlights.length ? Math.round((withNum / highlights.length) * 100) : 0;
  const summaryLen = (c.summary ?? '').trim().length;
  const hasEmail = !!(c.contact?.email ?? '').trim();
  const weak = highlights.filter((h) => WEAK_STARTS.some((re) => re.test(h.trim()))).length;
  const skillCount = (c.skills ?? []).reduce((n, g) => n + g.items.filter((i) => i.trim()).length, 0);

  return [
    { code: 'metrics', level: highlights.length >= 2 && pctNum >= 30 ? 'good' : 'warn', value: pctNum },
    { code: 'summary', level: summaryLen >= 200 && summaryLen <= 700 ? 'good' : 'warn', value: summaryLen },
    { code: 'bullets', level: highlights.length >= 3 ? 'good' : 'warn', value: highlights.length },
    { code: 'weakverbs', level: weak === 0 ? 'good' : 'warn', value: weak },
    { code: 'skills', level: skillCount >= 5 ? 'good' : 'warn', value: skillCount },
    { code: 'contact', level: hasEmail ? 'good' : 'warn', value: hasEmail ? 1 : 0 },
  ];
}
