// lib/sentra/cvStore.ts
//
// Store reactivo del asistente de CV. Implementado con `useSyncExternalStore`
// (primitiva nativa de React 19, exactamente sobre la que Zustand está
// construido): misma ergonomía (estado global + suscripción por selector),
// CERO dependencias nuevas, y verificable con `tsc` sin instalar nada.
//
// El stepper (formularios) y la vista previa A4 son hermanos que comparten el
// MISMO `content` sin prop-drilling: cualquiera lo muta, ambos re-renderizan.
//
// DURABILIDAD: este store vive en memoria. La persistencia real la da el
// autosave al backend (PUT /cv/{id}) en el wizard — mejor que localStorage,
// porque sobrevive a cambiar de dispositivo y no se contamina entre CVs.
'use client';

import { useSyncExternalStore } from 'react';
import type {
  CVContent,
  CVContact,
  CVCertification,
  CVEducation,
  CVExperienceItem,
  CVLanguage,
  CVSkillGroup,
} from '@/lib/sentra/api';

// El ORDEN es el flujo del asistente. 'review' = revisión final + envío.
export const CV_STEPS = ['personal', 'experience', 'education', 'skills', 'review'] as const;
export type CVStep = (typeof CV_STEPS)[number];

export const emptyContact: CVContact = { location: '', email: '', phone: '', website: '' };

export const emptyCVContent: CVContent = {
  full_name: '',
  headline: '',
  contact: { ...emptyContact },
  summary: '',
  certifications: [],
  experience: [],
  education: [],
  skills: [],
  languages: [],
  match_score: 0,
  missing_requirements: [],
  actionable_suggestions: [],
  tips: [],
};

export interface CVWizardState {
  cvId: string | null;
  jobPosting: string;
  content: CVContent;
  step: number;
}

let state: CVWizardState = {
  cvId: null,
  jobPosting: '',
  content: emptyCVContent,
  step: 0,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function commit(next: CVWizardState): void {
  state = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CVWizardState {
  return state;
}

// getServerSnapshot === getSnapshot: en el server el snapshot es el estado
// inicial (mismo objeto que en el primer render cliente) → sin hydration
// mismatch. La hidratación real ocurre en un efecto del wizard (solo cliente).
export function useCVWizard(): CVWizardState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function clampStep(step: number): number {
  return Math.max(0, Math.min(CV_STEPS.length - 1, step));
}

// Normalizadores RETROCOMPATIBLES: los CVs guardados antes de la migración a
// objetos tienen education/skills/languages como string[]. Aquí se convierten al
// vuelo a la forma nueva (objetos), espejo del backend, para que el editor y la
// vista previa nunca fallen sobre la forma vieja.
function normEducation(raw: unknown): CVEducation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e): CVEducation => {
      const x = e as { degree?: string; institution?: string; period?: string };
      return typeof e === 'string'
        ? { degree: e, institution: '', period: '' }
        : { degree: x?.degree ?? '', institution: x?.institution ?? '', period: x?.period ?? '' };
    })
    .filter((e) => e.degree || e.institution || e.period);
}

function normLanguages(raw: unknown): CVLanguage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l): CVLanguage => {
      if (typeof l === 'string') {
        const m = l.match(/^(.*?)\s*[(:]\s*(.*?)\)?\s*$/);
        return m ? { language: m[1].trim(), level: m[2].trim() } : { language: l.trim(), level: '' };
      }
      const x = l as { language?: string; level?: string };
      return { language: x?.language ?? '', level: x?.level ?? '' };
    })
    .filter((l) => l.language);
}

function normSkills(raw: unknown): CVSkillGroup[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  // Forma vieja: string[] → un único grupo sin categoría.
  if (raw.every((s) => typeof s === 'string')) {
    const items = (raw as string[]).map((s) => s.trim()).filter(Boolean);
    return items.length ? [{ category: '', items }] : [];
  }
  return raw.map((g): CVSkillGroup => {
    const x = g as { category?: string; items?: unknown };
    return {
      category: x?.category ?? '',
      items: Array.isArray(x?.items) ? (x.items as unknown[]).filter((i): i is string => typeof i === 'string') : [],
    };
  });
}

// Garantiza la forma NUEVA de todos los campos que evolucionaron después de que
// ya hubiera CVs guardados (contact, certifications, education, languages, skills).
function withContact(content: CVContent): CVContent {
  return {
    ...content,
    contact: { ...emptyContact, ...(content.contact ?? {}) },
    certifications: Array.isArray(content.certifications) ? content.certifications : [],
    education: normEducation(content.education),
    languages: normLanguages(content.languages),
    skills: normSkills(content.skills),
  };
}

export const cvWizard = {
  // Carga un CV recién generado/abierto. Resetea al primer paso.
  hydrate(cv: { id: string; job_posting: string; content: CVContent }): void {
    commit({ cvId: cv.id, jobPosting: cv.job_posting, content: withContact(cv.content), step: 0 });
  },
  // Reemplaza TODO el contenido (p. ej. tras una mejora con IA) SIN tocar el
  // paso actual: el usuario no debe ser expulsado al paso 0 al usar la varita.
  setContent(content: CVContent): void {
    commit({ ...state, content: withContact(content) });
  },
  setField<K extends keyof CVContent>(key: K, value: CVContent[K]): void {
    commit({ ...state, content: { ...state.content, [key]: value } });
  },
  setContact<K extends keyof CVContact>(key: K, value: CVContact[K]): void {
    commit({
      ...state,
      content: { ...state.content, contact: { ...emptyContact, ...state.content.contact, [key]: value } },
    });
  },
  setExperience(index: number, patch: Partial<CVExperienceItem>): void {
    commit({
      ...state,
      content: {
        ...state.content,
        experience: state.content.experience.map((e, i) => (i === index ? { ...e, ...patch } : e)),
      },
    });
  },
  addExperience(): void {
    commit({
      ...state,
      content: {
        ...state.content,
        experience: [
          ...state.content.experience,
          { role: '', company: '', period: '', highlights: [] },
        ],
      },
    });
  },
  removeExperience(index: number): void {
    commit({
      ...state,
      content: {
        ...state.content,
        experience: state.content.experience.filter((_, i) => i !== index),
      },
    });
  },
  setCertification(index: number, patch: Partial<CVCertification>): void {
    commit({
      ...state,
      content: {
        ...state.content,
        certifications: (state.content.certifications ?? []).map((c, i) =>
          i === index ? { ...c, ...patch } : c,
        ),
      },
    });
  },
  addCertification(): void {
    commit({
      ...state,
      content: {
        ...state.content,
        certifications: [...(state.content.certifications ?? []), { name: '', issuer: '', year: '' }],
      },
    });
  },
  removeCertification(index: number): void {
    commit({
      ...state,
      content: {
        ...state.content,
        certifications: (state.content.certifications ?? []).filter((_, i) => i !== index),
      },
    });
  },
  setEducation(index: number, patch: Partial<CVEducation>): void {
    commit({
      ...state,
      content: {
        ...state.content,
        education: (state.content.education ?? []).map((e, i) => (i === index ? { ...e, ...patch } : e)),
      },
    });
  },
  addEducation(): void {
    commit({
      ...state,
      content: {
        ...state.content,
        education: [...(state.content.education ?? []), { degree: '', institution: '', period: '' }],
      },
    });
  },
  removeEducation(index: number): void {
    commit({
      ...state,
      content: { ...state.content, education: (state.content.education ?? []).filter((_, i) => i !== index) },
    });
  },
  setLanguage(index: number, patch: Partial<CVLanguage>): void {
    commit({
      ...state,
      content: {
        ...state.content,
        languages: (state.content.languages ?? []).map((l, i) => (i === index ? { ...l, ...patch } : l)),
      },
    });
  },
  addLanguage(): void {
    commit({
      ...state,
      content: { ...state.content, languages: [...(state.content.languages ?? []), { language: '', level: '' }] },
    });
  },
  removeLanguage(index: number): void {
    commit({
      ...state,
      content: { ...state.content, languages: (state.content.languages ?? []).filter((_, i) => i !== index) },
    });
  },
  setSkillGroup(index: number, patch: Partial<CVSkillGroup>): void {
    commit({
      ...state,
      content: {
        ...state.content,
        skills: (state.content.skills ?? []).map((g, i) => (i === index ? { ...g, ...patch } : g)),
      },
    });
  },
  addSkillGroup(): void {
    commit({
      ...state,
      content: { ...state.content, skills: [...(state.content.skills ?? []), { category: '', items: [] }] },
    });
  },
  removeSkillGroup(index: number): void {
    commit({
      ...state,
      content: { ...state.content, skills: (state.content.skills ?? []).filter((_, i) => i !== index) },
    });
  },
  setCvId(cvId: string): void {
    commit({ ...state, cvId });
  },
  setStep(step: number): void {
    commit({ ...state, step: clampStep(step) });
  },
  next(): void {
    commit({ ...state, step: clampStep(state.step + 1) });
  },
  prev(): void {
    commit({ ...state, step: clampStep(state.step - 1) });
  },
  reset(): void {
    commit({ cvId: null, jobPosting: '', content: emptyCVContent, step: 0 });
  },
};

// Quita líneas/entradas vacías antes de persistir, compilar el PDF o mandar a
// la IA. El editor deja arrays con strings vacíos (una línea por ítem); esto
// los normaliza sin mutar el estado del store.
export function cleanCVContent(x: CVContent): CVContent {
  return {
    ...x,
    education: (x.education ?? []).filter((e) => e.degree.trim() || e.institution.trim()),
    languages: (x.languages ?? []).filter((l) => l.language.trim()),
    skills: (x.skills ?? [])
      .map((g) => ({ ...g, items: g.items.filter((i) => i.trim()) }))
      .filter((g) => g.category.trim() || g.items.length > 0),
    certifications: (x.certifications ?? []).filter((c) => c.name.trim()),
    experience: x.experience
      .map((e) => ({ ...e, highlights: e.highlights.filter((h) => h.trim()) }))
      .filter((e) => e.role.trim() || e.company.trim() || e.highlights.length > 0),
  };
}
