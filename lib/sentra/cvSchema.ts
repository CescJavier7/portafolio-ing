// lib/sentra/cvSchema.ts
//
// Validación de COMPLETITUD del CV con Zod. Es la fuente de verdad de "¿está
// 100% completo?" que bloquea la descarga/envío en el wizard. Zod nos dice QUÉ
// campo falla (por `path`); aquí lo mapeamos a mensajes en español y a marcas
// rojas por campo, sin acoplarnos a la API de mensajes de Zod (robusto entre
// versiones).
import { z } from 'zod';
import type { CVContent } from '@/lib/sentra/api';

// Valores que cuentan como "sin fecha" → se tratan como incompletos para forzar
// al usuario a poner una fecha real.
const BAD_PERIODS = new Set(['', 'fecha no especificada', 'periodo', 'período', 'sin especificar', 'n/a']);

const hasContent = (arr: string[]) => arr.some((x) => x.trim().length > 0);

const experienceSchema = z.object({
  role: z.string().trim().min(1),
  company: z.string().optional(),
  period: z.string().trim().min(1).refine((p) => !BAD_PERIODS.has(p.trim().toLowerCase())),
  highlights: z.array(z.string()).refine(hasContent),
});

// Esquema de CV COMPLETO. Usa `passthrough` para ignorar campos extra
// (match_score, tips, etc.) sin fallar por ellos.
export const cvCompleteSchema = z.object({
  full_name: z.string().trim().min(1),
  headline: z.string().trim().min(1),
  summary: z.string().trim().min(20),
  experience: z.array(experienceSchema).min(1),
  education: z.array(z.string()).refine(hasContent),
  skills: z.array(z.string()).refine(hasContent),
});

export interface CVFieldErrors {
  full_name?: string;
  headline?: string;
  summary?: string;
  skills?: string;
  education?: string;
  experienceTop?: string; // "agrega al menos una experiencia"
  experience: Record<number, { role?: string; period?: string; highlights?: string }>;
}

export interface CVValidation {
  ok: boolean;
  errors: CVFieldErrors;
  missing: string[]; // lista legible para el banner "te falta…"
}

const MSG = {
  full_name: 'Falta tu nombre completo',
  headline: 'Falta el titular profesional',
  summary: 'El resumen es muy corto (mín. 20 caracteres)',
  skills: 'Agrega al menos una habilidad',
  education: 'Agrega al menos un estudio o formación',
  experienceTop: 'Agrega al menos una experiencia',
  role: 'Falta el cargo',
  period: 'Falta la fecha',
  highlights: 'Falta la descripción (un logro por línea)',
};

export function validateCV(content: CVContent): CVValidation {
  const errors: CVFieldErrors = { experience: {} };
  const missing: string[] = [];
  const res = cvCompleteSchema.safeParse(content);
  if (res.success) return { ok: true, errors, missing };

  for (const issue of res.error.issues) {
    const [field, idx, sub] = issue.path as (string | number)[];
    if (field === 'experience' && typeof idx === 'number') {
      const e = errors.experience[idx] ?? (errors.experience[idx] = {});
      if (sub === 'role') { e.role = MSG.role; missing.push(`Exp. ${idx + 1}: ${MSG.role.toLowerCase()}`); }
      else if (sub === 'period') { e.period = MSG.period; missing.push(`Exp. ${idx + 1}: ${MSG.period.toLowerCase()}`); }
      else if (sub === 'highlights') { e.highlights = MSG.highlights; missing.push(`Exp. ${idx + 1}: ${MSG.highlights.toLowerCase()}`); }
      else { errors.experienceTop = MSG.experienceTop; missing.push(MSG.experienceTop); }
    } else if (field === 'experience') {
      errors.experienceTop = MSG.experienceTop;
      missing.push(MSG.experienceTop);
    } else if (field === 'full_name') { errors.full_name = MSG.full_name; missing.push(MSG.full_name); }
    else if (field === 'headline') { errors.headline = MSG.headline; missing.push(MSG.headline); }
    else if (field === 'summary') { errors.summary = MSG.summary; missing.push(MSG.summary); }
    else if (field === 'skills') { errors.skills = MSG.skills; missing.push(MSG.skills); }
    else if (field === 'education') { errors.education = MSG.education; missing.push(MSG.education); }
  }

  return { ok: false, errors, missing: [...new Set(missing)] };
}
