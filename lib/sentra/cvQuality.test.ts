import { describe, it, expect } from 'vitest';
import { atsCoverage, cvQualityChecks, estimateCVFit, cvText } from '@/lib/sentra/cvQuality';
import type { CVContent } from '@/lib/sentra/api';

function makeCV(over: Partial<CVContent> = {}): CVContent {
  return {
    full_name: 'Kevin Montatixe',
    headline: 'Security Engineer',
    contact: { location: 'Quito', email: 'k@x.com', phone: '', website: '' },
    summary: '',
    experience: [],
    education: [],
    certifications: [],
    skills: [],
    languages: [],
    match_score: 0,
    missing_requirements: [],
    actionable_suggestions: [],
    tips: [],
    ...over,
  };
}

describe('cvText', () => {
  it('junta headline, resumen, skills y experiencia en minúsculas', () => {
    const cv = makeCV({
      headline: 'Backend Dev',
      summary: 'OWASP y pentesting',
      skills: [{ category: 'Sec', items: ['Nmap', 'Burp'] }],
      experience: [{ role: 'Engineer', company: 'Acme', period: '', highlights: ['Reduje bugs'] }],
    });
    const text = cvText(cv);
    expect(text).toContain('backend dev');
    expect(text).toContain('nmap');
    expect(text).toContain('reduje bugs');
    expect(text).toBe(text.toLowerCase());
  });
});

describe('atsCoverage', () => {
  it('marca cubierto un requisito que ya aparece en el CV (re-chequeo)', () => {
    const cv = makeCV({
      missing_requirements: ['Docker', 'Kubernetes'],
      skills: [{ category: 'Infra', items: ['Docker', 'Linux'] }],
    });
    const res = atsCoverage(cv);
    const docker = res.find((r) => r.requirement === 'Docker');
    const k8s = res.find((r) => r.requirement === 'Kubernetes');
    expect(docker?.covered).toBe(true); // ya está en skills
    expect(k8s?.covered).toBe(false); // sigue faltando
  });

  it('sin requisitos faltantes devuelve lista vacía', () => {
    expect(atsCoverage(makeCV())).toEqual([]);
  });
});

describe('cvQualityChecks', () => {
  it('premia bullets con métricas y penaliza su ausencia', () => {
    const withMetrics = makeCV({
      experience: [{ role: 'Eng', company: 'A', period: '', highlights: ['Reduje vulnerabilidades 60%', 'Bajé el MTTR 3x'] }],
    });
    const noMetrics = makeCV({
      experience: [{ role: 'Eng', company: 'A', period: '', highlights: ['Trabajé en seguridad', 'Hice tareas'] }],
    });
    const m = cvQualityChecks(withMetrics).find((c) => c.code === 'metrics');
    const n = cvQualityChecks(noMetrics).find((c) => c.code === 'metrics');
    expect(m?.level).toBe('good');
    expect(n?.level).toBe('warn');
  });

  it('detecta arranques de verbo débiles', () => {
    const cv = makeCV({
      experience: [{ role: 'Eng', company: 'A', period: '', highlights: ['Encargado de la seguridad', 'Ayudé a mejorar el sistema'] }],
    });
    const weak = cvQualityChecks(cv).find((c) => c.code === 'weakverbs');
    expect(weak?.level).toBe('warn');
    expect(weak?.value).toBeGreaterThan(0);
  });

  it('marca warn si falta el correo de contacto', () => {
    const cv = makeCV({ contact: { location: 'Quito', email: '', phone: '', website: '' } });
    const contact = cvQualityChecks(cv).find((c) => c.code === 'contact');
    expect(contact?.level).toBe('warn');
  });

  it('siempre devuelve los 6 chequeos', () => {
    const codes = cvQualityChecks(makeCV()).map((c) => c.code).sort();
    expect(codes).toEqual(['bullets', 'contact', 'metrics', 'skills', 'summary', 'weakverbs']);
  });
});

describe('estimateCVFit', () => {
  it('un CV mínimo cabe en una página', () => {
    const fit = estimateCVFit(makeCV({ summary: 'Breve resumen profesional.' }));
    expect(fit.pages).toBe(1);
    expect(fit.level).toBe('good');
  });

  it('un CV enorme se estima en 2+ páginas', () => {
    const bigHighlights = Array.from({ length: 12 }, (_, i) => `Logro número ${i} con bastante detalle y una descripción larga que ocupa espacio en la línea`);
    const cv = makeCV({
      summary: 'x'.repeat(600),
      experience: Array.from({ length: 5 }, (_, i) => ({ role: `Rol ${i}`, company: `Empresa ${i}`, period: '2020-2024', highlights: bigHighlights })),
      skills: [{ category: 'Muchas', items: Array.from({ length: 30 }, (_, i) => `skill${i}`) }],
    });
    const fit = estimateCVFit(cv);
    expect(fit.pages).toBeGreaterThanOrEqual(2);
    expect(fit.level).toBe('warn');
  });
});
