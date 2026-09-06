// lib/academia.ts
// Lector del contenido de la Academia. Mismo enfoque que el blog: lecciones en
// Markdown con frontmatter (content/academia/{lang}/{track}/{NN-slug}.md). El
// currículo se mantiene solo: agregar un .md nuevo lo añade sin tocar código.
//
// Gating: cada lección declara `access: free|pro`. Las `pro` NO se renderizan en
// el HTML público — su cuerpo se sirve por una API autenticada (ver
// app/api/academia/lesson). Aquí solo se lee del disco (server-side).
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export type Lang = 'es' | 'en';
export type Access = 'free' | 'pro';

export interface TrackMeta {
  slug: string;
  icon: 'terminal' | 'shield' | 'binary';
  title: Record<Lang, string>;
  desc: Record<Lang, string>;
}

// Los 3 tracks de la landing (AcademyPage.tsx). El contenido vive en carpetas
// con estos slugs.
export const TRACKS: TrackMeta[] = [
  {
    slug: 'fullstack',
    icon: 'terminal',
    title: { es: 'Desarrollo full-stack', en: 'Full-stack development' },
    desc: {
      es: 'De la idea al despliegue: interfaces, APIs, datos e infraestructura, integrados de punta a punta.',
      en: 'From idea to deploy: interfaces, APIs, data and infrastructure, integrated end to end.',
    },
  },
  {
    slug: 'ciberseguridad',
    icon: 'shield',
    title: { es: 'Ciberseguridad aplicada', en: 'Applied cybersecurity' },
    desc: {
      es: 'Seguridad desde el diseño: pensar como quien ataca para construir como quien defiende.',
      en: 'Security by design: think like an attacker to build like a defender.',
    },
  },
  {
    slug: 'fundamentos',
    icon: 'binary',
    title: { es: 'Fundamentos de computación', en: 'Computing fundamentals' },
    desc: {
      es: 'Lo que sostiene todo lo demás, explicado en un lenguaje que cualquiera entiende.',
      en: 'What everything else stands on, explained so anyone gets it.',
    },
  },
];

export interface LessonMeta {
  track: string;
  slug: string; // slug del archivo sin el prefijo NN- (URL-friendly)
  file: string; // nombre real del archivo (con el NN-)
  title: string;
  module: string;
  order: number;
  duration: string;
  access: Access;
  description: string;
}

// Pregunta de quiz declarada en el frontmatter de la lección:
//   quiz:
//     - q: "¿...?"
//       options: ["A", "B", "C"]
//       answer: 1          # índice (0-based) de la correcta
//       explain: "por qué"
export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface Lesson extends LessonMeta {
  content: string;
  quiz: QuizQuestion[];
}

function parseQuiz(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: any) => ({
      q: String(item?.q ?? '').trim(),
      options: Array.isArray(item?.options) ? item.options.map((o: any) => String(o)) : [],
      answer: Number.isInteger(item?.answer) ? Number(item.answer) : -1,
      explain: item?.explain ? String(item.explain) : undefined,
    }))
    .filter((x) => x.q && x.options.length >= 2 && x.answer >= 0 && x.answer < x.options.length);
}

const ROOT = path.join(process.cwd(), 'content', 'academia');

export function getTrackMeta(trackSlug: string): TrackMeta | undefined {
  return TRACKS.find((t) => t.slug === trackSlug);
}

// El slug de URL quita el prefijo de orden "NN-" del nombre de archivo.
function fileToSlug(file: string): string {
  return file.replace(/\.md$/, '').replace(/^\d+[-_]/, '');
}

function trackDir(lang: Lang, trackSlug: string): string | null {
  const dir = path.join(ROOT, lang, trackSlug);
  if (fs.existsSync(dir)) return dir;
  // Fallback a español si aún no hay traducción de ese track.
  const es = path.join(ROOT, 'es', trackSlug);
  return fs.existsSync(es) ? es : null;
}

function parseMeta(dir: string, file: string, trackSlug: string): LessonMeta {
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  const { data } = matter(raw);
  return {
    track: trackSlug,
    slug: fileToSlug(file),
    file,
    title: String(data.title ?? fileToSlug(file)),
    module: String(data.module ?? 'General'),
    order: Number(data.order ?? 999),
    duration: String(data.duration ?? ''),
    access: (data.access === 'pro' ? 'pro' : 'free') as Access,
    description: String(data.description ?? ''),
  };
}

/** Lecciones de un track (metadatos), ordenadas. */
export function getTrackLessons(trackSlug: string, lang: Lang): LessonMeta[] {
  const dir = trackDir(lang, trackSlug);
  if (!dir) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseMeta(dir, f, trackSlug))
    .sort((a, b) => a.order - b.order);
}

/** Lecciones agrupadas por módulo (preservando el orden). */
export function getTrackModules(trackSlug: string, lang: Lang): { module: string; lessons: LessonMeta[] }[] {
  const lessons = getTrackLessons(trackSlug, lang);
  const groups: { module: string; lessons: LessonMeta[] }[] = [];
  for (const l of lessons) {
    let g = groups.find((x) => x.module === l.module);
    if (!g) {
      g = { module: l.module, lessons: [] };
      groups.push(g);
    }
    g.lessons.push(l);
  }
  return groups;
}

/** Una lección completa (metadatos + contenido). null si no existe. */
export function getLesson(trackSlug: string, lessonSlug: string, lang: Lang): Lesson | null {
  const dir = trackDir(lang, trackSlug);
  if (!dir) return null;
  const file = fs.readdirSync(dir).find((f) => f.endsWith('.md') && fileToSlug(f) === lessonSlug);
  if (!file) return null;
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  const { data, content } = matter(raw);
  const meta = parseMeta(dir, file, trackSlug);
  return {
    ...meta,
    content,
    description: String(data.description ?? meta.description),
    quiz: parseQuiz(data.quiz),
  };
}

/** Lección anterior/siguiente dentro del track (para la navegación). */
export function getAdjacentLessons(trackSlug: string, lessonSlug: string, lang: Lang) {
  const lessons = getTrackLessons(trackSlug, lang);
  const i = lessons.findIndex((l) => l.slug === lessonSlug);
  return {
    prev: i > 0 ? lessons[i - 1] : null,
    next: i >= 0 && i < lessons.length - 1 ? lessons[i + 1] : null,
  };
}

/** Params para generateStaticParams del visor de lección (ambos idiomas). */
export function getAllLessonParams(): { lang: Lang; track: string; lesson: string }[] {
  const out: { lang: Lang; track: string; lesson: string }[] = [];
  for (const lang of ['es', 'en'] as Lang[]) {
    for (const t of TRACKS) {
      for (const l of getTrackLessons(t.slug, lang)) {
        out.push({ lang, track: t.slug, lesson: l.slug });
      }
    }
  }
  return out;
}
