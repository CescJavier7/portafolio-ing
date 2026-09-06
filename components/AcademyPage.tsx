'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Terminal,
  ShieldCheck,
  Binary,
  ArrowRight,
  Compass,
  GitBranch,
  Layers,
  LayoutDashboard,
  Lock,
} from 'lucide-react';
import { useSentraSession } from '@/lib/sentra/useSession';

// Academia — identidad propia (estética "blueprint" de ingeniería), distinta
// de Sentra (verde) y del CV (azul). Bilingüe inline (bounded) mientras el
// currículo se termina de definir.
const T = {
  es: {
    status: 'v0 · cohorte piloto 2026',
    eyebrow: 'ACADEMIA · INGENIERÍA DE SOFTWARE Y SEGURIDAD',
    title: 'Aprende a construir.\nY a defender.',
    subtitle:
      'No son cursos sueltos: es un criterio de ingeniería. De la primera línea de código al despliegue en producción — con la seguridad puesta desde el diseño, no parchada al final.',
    principlesTitle: '// método',
    principles: [
      { icon: 'compass', title: 'Un solo criterio', desc: 'Tres rutas, una misma forma de pensar la ingeniería: correcta, segura y mantenible.' },
      { icon: 'git', title: 'Proyectos reales', desc: 'Construyes cosas que se despliegan y se defienden, no ejercicios de juguete.' },
      { icon: 'layers', title: 'Del concepto al deploy', desc: 'Cierras el ciclo completo: diseño, código, pruebas, contenedores y CI/CD.' },
    ],
    curriculumTitle: 'El currículo',
    curriculumNote:
      'Tres tracks que se cursan en paralelo. Cada lección cierra con un quiz, y completar una ruta emite un certificado verificable.',
    tracks: [
      {
        code: 'TRACK 01',
        icon: 'terminal',
        title: 'Desarrollo full-stack',
        desc: 'De la idea al despliegue: interfaces, APIs, datos e infraestructura, integrados de punta a punta.',
        topics: ['React / Next.js', 'FastAPI', 'PostgreSQL', 'Docker', 'CI/CD'],
      },
      {
        code: 'TRACK 02',
        icon: 'shield',
        title: 'Ciberseguridad aplicada',
        desc: 'Seguridad desde el diseño: pensar como quien ataca para construir como quien defiende.',
        topics: ['OWASP Top 10', 'AuthN / AuthZ', 'Criptografía', 'Análisis de vulnerabilidades', 'Respuesta a incidentes'],
      },
      {
        code: 'TRACK 03',
        icon: 'binary',
        title: 'Fundamentos de computación',
        desc: 'Lo que sostiene todo lo demás, explicado en un lenguaje que cualquiera entiende.',
        topics: ['Redes', 'Sistemas operativos', 'Estructuras de datos', 'Lógica', 'Bases de datos'],
      },
    ],
    planTitle: 'Incluida en tu plan',
    planBody:
      'La Academia no se cobra aparte. El plan único de USD 10/mes lo incluye todo: Sentra (seguridad continua), Sentra CV AI (empleabilidad) y la Academia (aprendizaje). Un pago, tres herramientas.',
    // CTAs por estado de sesión
    ctaSeePlan: 'Ver el plan',
    ctaCreate: 'Crear cuenta',
    ctaPanel: 'Ir a tu panel',
    ctaUnlock: 'Desbloquear con Pro',
    noteAnon: 'Estamos produciendo los primeros módulos. Crea tu cuenta para que te avisemos al abrir.',
    noteFree: 'Estamos produciendo los primeros módulos. Con el plan Pro la Academia queda incluida.',
    notePro: 'Tu plan ya incluye la Academia. Los módulos están en producción — te avisaremos apenas abran.',
    included: 'Incluida en tu plan Pro',
  },
  en: {
    status: 'v0 · pilot cohort 2026',
    eyebrow: 'ACADEMY · SOFTWARE & SECURITY ENGINEERING',
    title: 'Learn to build.\nAnd to defend.',
    subtitle:
      'Not scattered courses — an engineering mindset. From the first line of code to production deploy, with security built in by design, not patched at the end.',
    principlesTitle: '// method',
    principles: [
      { icon: 'compass', title: 'One mindset', desc: 'Three tracks, one way of thinking about engineering: correct, secure and maintainable.' },
      { icon: 'git', title: 'Real projects', desc: 'You build things that deploy and defend themselves, not toy exercises.' },
      { icon: 'layers', title: 'Concept to deploy', desc: 'You close the full loop: design, code, tests, containers and CI/CD.' },
    ],
    curriculumTitle: 'The curriculum',
    curriculumNote:
      'Three tracks taken in parallel. Every lesson ends with a quiz, and finishing a track issues a verifiable certificate.',
    tracks: [
      {
        code: 'TRACK 01',
        icon: 'terminal',
        title: 'Full-stack development',
        desc: 'From idea to deploy: interfaces, APIs, data and infrastructure, wired end to end.',
        topics: ['React / Next.js', 'FastAPI', 'PostgreSQL', 'Docker', 'CI/CD'],
      },
      {
        code: 'TRACK 02',
        icon: 'shield',
        title: 'Applied cybersecurity',
        desc: 'Security by design: think like an attacker to build like a defender.',
        topics: ['OWASP Top 10', 'AuthN / AuthZ', 'Cryptography', 'Vulnerability analysis', 'Incident response'],
      },
      {
        code: 'TRACK 03',
        icon: 'binary',
        title: 'Computing fundamentals',
        desc: 'What holds everything else up, explained in plain language.',
        topics: ['Networks', 'Operating systems', 'Data structures', 'Logic', 'Databases'],
      },
    ],
    planTitle: 'Included in your plan',
    planBody:
      'The Academy is not billed separately. The single USD 10/mo plan includes it all: Sentra (continuous security), Sentra CV AI (employability) and the Academy (learning). One payment, three tools.',
    ctaSeePlan: 'See the plan',
    ctaCreate: 'Create account',
    ctaPanel: 'Go to your panel',
    ctaUnlock: 'Unlock with Pro',
    noteAnon: 'We are producing the first modules. Create your account so we can notify you when it opens.',
    noteFree: 'We are producing the first modules. The Pro plan includes the Academy.',
    notePro: 'Your plan already includes the Academy. Modules are in production — we will notify you the moment they open.',
    included: 'Included in your Pro plan',
  },
};

const ICONS = { terminal: Terminal, shield: ShieldCheck, binary: Binary };
// Enlace de cada track a su currículo (slug real en content/academia + lib/academia.ts).
const TRACK_SLUG: Record<string, string> = { terminal: 'fullstack', shield: 'ciberseguridad', binary: 'fundamentos' };
const PRINCIPLE_ICONS = { compass: Compass, git: GitBranch, layers: Layers };

// Papel técnico (blueprint): cuadrícula sutil de fondo, la firma visual de la
// Academia. Se pinta por encima del color de fondo.
const BLUEPRINT: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(to right, rgba(99,102,241,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.10) 1px, transparent 1px)',
  backgroundSize: '34px 34px',
};

export default function AcademyPage({ lang }: { lang: 'es' | 'en' }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const { user } = useSentraSession();
  const isPro = user?.plan === 'PRO';

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-[#080b16] transition-colors duration-500">
      {/* Cuadrícula blueprint + halo índigo */}
      <div className="pointer-events-none absolute inset-0" style={BLUEPRINT} />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-32 pb-24">
        {/* ── HERO ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="font-mono text-[11px] tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              {t.eyebrow}
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> {t.status}
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white mb-5 whitespace-pre-line leading-[1.05]">
            {t.title}
          </h1>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            {t.subtitle}
          </p>
        </motion.div>

        {/* ── MÉTODO ── */}
        <div className="mt-16 mb-20">
          <p className="font-mono text-[12px] tracking-widest text-slate-400 dark:text-slate-500 mb-5">{t.principlesTitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-200 dark:bg-white/10">
            {t.principles.map((p) => {
              const Icon = PRINCIPLE_ICONS[p.icon as keyof typeof PRINCIPLE_ICONS];
              return (
                <div key={p.title} className="bg-slate-50 dark:bg-[#0b1020] p-6">
                  <Icon className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mb-3" />
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">{p.title}</h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CURRÍCULO ── */}
        <div className="mb-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-7">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {t.curriculumTitle}
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-md sm:text-right">{t.curriculumNote}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {t.tracks.map((tr) => {
              const Icon = ICONS[tr.icon as keyof typeof ICONS];
              return (
                <Link
                  key={tr.code}
                  href={`/${lang}/academia/${TRACK_SLUG[tr.icon] ?? ''}`}
                  className="group relative rounded-2xl bg-white dark:bg-[#0b1020] border border-slate-200 dark:border-white/10 p-6 hover:border-indigo-400/60 dark:hover:border-indigo-400/40 transition-colors"
                >
                  {/* barra técnica superior */}
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 dark:text-slate-500">{tr.code}</span>
                    <span className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-1.5">{tr.title}</h3>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-5">{tr.desc}</p>
                  <div className="flex flex-wrap gap-1.5 pt-4 border-t border-dashed border-slate-200 dark:border-white/10">
                    {tr.topics.map((top) => (
                      <span
                        key={top}
                        className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300"
                      >
                        {top}
                      </span>
                    ))}
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1 text-[12px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
                    {lang === 'en' ? 'View lessons' : 'Ver lecciones'} <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── PLAN / CTA (consciente de sesión) ── */}
        <div className="relative rounded-3xl bg-slate-900 dark:bg-[#0b1020] border border-indigo-500/30 p-8 md:p-10 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5]" style={BLUEPRINT} />
          <div className="relative">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-indigo-300 mb-3">
              {isPro ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {isPro ? t.included : t.planTitle}
            </p>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl mb-7 leading-relaxed">{t.planBody}</p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Sin sesión → ver plan + crear cuenta.
                  Con sesión FREE → desbloquear con Pro + panel.
                  Con sesión PRO → ir al panel (ya la tiene incluida). */}
              {!user && (
                <>
                  <Link href={`/${lang}/sentinel/precios`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 transition-colors">
                    {t.ctaSeePlan} <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href={`/${lang}/sentinel/register`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-slate-200 text-sm font-bold hover:bg-white/5 transition-colors">
                    {t.ctaCreate}
                  </Link>
                </>
              )}
              {user && !isPro && (
                <>
                  <Link href={`/${lang}/sentinel/precios`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 transition-colors">
                    {t.ctaUnlock} <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link href={`/${lang}/sentinel/panel`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-slate-200 text-sm font-bold hover:bg-white/5 transition-colors">
                    <LayoutDashboard className="w-4 h-4" /> {t.ctaPanel}
                  </Link>
                </>
              )}
              {user && isPro && (
                <Link href={`/${lang}/sentinel/panel`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-400 transition-colors">
                  <LayoutDashboard className="w-4 h-4" /> {t.ctaPanel}
                </Link>
              )}
            </div>

            <p className="text-[12px] text-slate-400 mt-6">
              {!user ? t.noteAnon : isPro ? t.notePro : t.noteFree}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
