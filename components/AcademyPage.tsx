import Link from 'next/link';
import { GraduationCap, Code2, ShieldCheck, Cpu, ArrowRight, Sparkles } from 'lucide-react';

// Página "Academia — en desarrollo". Bilingüe inline (bounded) para no acoplar
// un bloque grande de diccionario mientras el producto aún se define.
const T = {
  es: {
    badge: 'En desarrollo',
    title: 'La Academia',
    subtitle:
      'Aprende a construir software que se defiende solo — de la mano de quien lo construye y lo enseña. Parte del mismo plan, sin costo extra.',
    ways: 'Tres rutas, un mismo criterio',
    tracks: [
      { icon: 'code', title: 'Desarrollo full-stack', desc: 'De la idea al despliegue: React/Next.js, APIs con FastAPI, bases de datos, Docker y CI/CD. Proyectos reales, no ejercicios de juguete.' },
      { icon: 'shield', title: 'Ciberseguridad aplicada', desc: 'Seguridad desde el diseño: OWASP, control de acceso, cifrado, análisis de vulnerabilidades y respuesta a incidentes.' },
      { icon: 'cpu', title: 'Fundamentos de informática', desc: 'Lo que sostiene todo lo demás: redes, sistemas, lógica y datos, explicado en un lenguaje que cualquiera entiende.' },
    ],
    planTitle: 'Incluida en tu plan',
    planBody:
      'La Academia no se cobra aparte. El plan único de USD 10/mes lo incluye todo: Sentra (seguridad continua), Sentra CV AI (empleabilidad) y la Academia (aprendizaje). Un solo pago, tres herramientas.',
    ctaPrimary: 'Ver el plan',
    ctaSecondary: 'Crear cuenta gratis',
    note: 'Estamos produciendo los primeros cursos. Crea tu cuenta para avisarte cuando abra.',
  },
  en: {
    badge: 'In progress',
    title: 'The Academy',
    subtitle:
      'Learn to build software that defends itself — from someone who builds it and teaches it. Part of the same plan, at no extra cost.',
    ways: 'Three tracks, one mindset',
    tracks: [
      { icon: 'code', title: 'Full-stack development', desc: 'From idea to deploy: React/Next.js, FastAPI APIs, databases, Docker and CI/CD. Real projects, not toy exercises.' },
      { icon: 'shield', title: 'Applied cybersecurity', desc: 'Security by design: OWASP, access control, encryption, vulnerability analysis and incident response.' },
      { icon: 'cpu', title: 'Computing fundamentals', desc: 'What holds everything up: networks, systems, logic and data, explained in plain language.' },
    ],
    planTitle: 'Included in your plan',
    planBody:
      'The Academy is not billed separately. The single USD 10/mo plan includes it all: Sentra (continuous security), Sentra CV AI (employability) and the Academy (learning). One payment, three tools.',
    ctaPrimary: 'See the plan',
    ctaSecondary: 'Create free account',
    note: 'We are producing the first courses. Create your account to be notified when it opens.',
  },
};

const ICONS = { code: Code2, shield: ShieldCheck, cpu: Cpu };

export default function AcademyPage({ lang }: { lang: 'es' | 'en' }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 mb-6">
            <GraduationCap className="w-3.5 h-3.5" /> {t.badge}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white mb-4">{t.title}</h1>
          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">{t.subtitle}</p>
        </div>

        <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white text-center mb-6">{t.ways}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14">
          {t.tracks.map((tr) => {
            const Icon = ICONS[tr.icon as keyof typeof ICONS];
            return (
              <div key={tr.title} className="rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white mb-1.5">{tr.title}</h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{tr.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-3xl bg-zinc-900 dark:bg-black border border-zinc-800 p-8 md:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative z-10">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-green-400 mb-3">
              <Sparkles className="w-3.5 h-3.5" /> {t.planTitle}
            </p>
            <p className="text-sm md:text-base text-zinc-300 max-w-xl mx-auto mb-7 leading-relaxed">{t.planBody}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={`/${lang}/sentinel/precios`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform">
                {t.ctaPrimary} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={`/${lang}/sentinel/register`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-white/5 transition-colors">
                {t.ctaSecondary}
              </Link>
            </div>
            <p className="text-[12px] text-zinc-500 mt-5">{t.note}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
