'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import Image from 'next/image';
import { useLenis } from 'lenis/react';
import { ShieldCheck, Brain, BookOpen, Languages, X, ExternalLink, BadgeCheck, type LucideIcon } from 'lucide-react';
import {
  buildCertifications,
  earliestYear,
  groupByArea,
  type CertArea,
  type CertKind,
  type Certification,
  type CertText,
} from '@/lib/certifications';

// Icono y acento por área. El color solo tiñe el icono: las tarjetas son neutras
// para que el protagonista sea el documento.
const AREA_VISUALS: Record<CertArea, { icon: LucideIcon; accent: string }> = {
  cyber: { icon: ShieldCheck, accent: 'text-emerald-500' },
  ai: { icon: Brain, accent: 'text-violet-500' },
  education: { icon: BookOpen, accent: 'text-orange-500' },
  languages: { icon: Languages, accent: 'text-sky-500' },
};

// ─── TIPADO DEL DICCIONARIO ───────────────────────────────────────────────────
interface CertificationsDictionary {
  tag: string;
  title: string;
  description: string;
  filtersLabel: string;
  all: string;
  countSingular: string;
  countPlural: string;
  areasWord: string;
  sinceWord: string;
  showing: string;
  empty: string;
  featured: string;
  openDetails: string;
  close: string;
  issuerLabel: string;
  dateLabel: string;
  typeLabel: string;
  viewFull: string;
  verify: string;
  areas: Record<CertArea, string>;
  kinds: Record<CertKind, string>;
  items: CertText[];
}

interface CertificationsAppleProps {
  dict?: CertificationsDictionary;
  lang?: 'es' | 'en';
}

type Filter = CertArea | 'all';

// En «Todas», cada área ocupa en escritorio solo las columnas que necesitan sus
// tarjetas (una destacada cuenta doble), para que las áreas pequeñas compartan
// fila en vez de dejar huecos. Clases estáticas para que Tailwind las detecte.
const GROUP_SPAN: Record<number, { group: string; grid: string }> = {
  1: { group: 'lg:col-span-3', grid: 'lg:grid-cols-1' },
  2: { group: 'lg:col-span-6', grid: 'lg:grid-cols-2' },
  3: { group: 'lg:col-span-9', grid: 'lg:grid-cols-3' },
  4: { group: 'lg:col-span-12', grid: 'lg:grid-cols-4' },
};
const FULL = GROUP_SPAN[4];

function groupColumns(items: Certification[]) {
  const units = items.reduce((n, c) => n + (c.featured ? 2 : 1), 0);
  return GROUP_SPAN[Math.min(4, Math.max(1, units))];
}
const EASE = [0.16, 1, 0.3, 1] as const;

export default function CertificationsApple({ dict, lang = 'es' }: CertificationsAppleProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<Certification | null>(null);

  const certs = useMemo(() => buildCertifications(dict?.items ?? []), [dict?.items]);
  const groups = useMemo(() => groupByArea(certs), [certs]);

  // Programación defensiva: sin diccionario válido, no renderizamos nada roto.
  if (!dict || !certs.length) {
    console.error("Critical: 'dict.items' is missing in CertificationsApple");
    return null;
  }

  const count = (n: number) => `${n} ${n === 1 ? dict.countSingular : dict.countPlural}`;
  const since = earliestYear(certs);
  const visibleGroups = filter === 'all' ? groups : groups.filter((g) => g.area === filter);
  const visibleCount = visibleGroups.reduce((n, g) => n + g.items.length, 0);

  return (
    <MotionConfig reducedMotion="user">
      <section
        id="certificados"
        aria-labelledby="certificados-title"
        className="py-24 bg-white dark:bg-black transition-colors duration-500"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* ENCABEZADO EDITORIAL + RESUMEN CALCULADO DE LOS DATOS */}
          <motion.div
            className="mb-10 md:mb-14 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <div>
              <p className="text-blue-500 font-bold tracking-tight mb-3 uppercase text-xs italic">{dict.tag}</p>
              <h2
                id="certificados-title"
                className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 text-zinc-900 dark:text-white"
              >
                {dict.title}
              </h2>
              <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl text-balance">
                {dict.description}
              </p>
            </div>
            <dl className="flex gap-8 lg:gap-10 shrink-0">
              <Stat value={certs.length} label={certs.length === 1 ? dict.countSingular : dict.countPlural} />
              <Stat value={groups.length} label={dict.areasWord} />
              {since && <Stat value={since} label={dict.sinceWord} />}
            </dl>
          </motion.div>

          {/* FILTROS POR ÁREA (con su cantidad real) */}
          <div
            role="group"
            aria-label={dict.filtersLabel}
            className="-mx-4 px-4 md:mx-0 md:px-0 mb-10 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={dict.all} n={certs.length} />
            {groups.map((g) => {
              const { icon: Icon, accent } = AREA_VISUALS[g.area];
              return (
                <FilterChip
                  key={g.area}
                  active={filter === g.area}
                  onClick={() => setFilter(g.area)}
                  label={dict.areas[g.area]}
                  n={g.items.length}
                  icon={<Icon className={`w-4 h-4 ${filter === g.area ? '' : accent}`} aria-hidden />}
                />
              );
            })}
          </div>
          <p className="sr-only" aria-live="polite">
            {dict.showing.replace('{n}', String(visibleCount)).replace('{total}', String(certs.length))}
          </p>

          {/* COLECCIÓN AGRUPADA POR ÁREA */}
          <AnimatePresence mode="wait">
            <motion.div
              key={filter}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-14 md:gap-y-16"
            >
              {visibleGroups.length === 0 && (
                <p className="lg:col-span-12 py-16 text-center text-zinc-500 dark:text-zinc-400">{dict.empty}</p>
              )}
              {visibleGroups.map((g) => {
                const { icon: Icon, accent } = AREA_VISUALS[g.area];
                const cols = filter === 'all' ? groupColumns(g.items) : FULL;
                return (
                  <div key={g.area} role="region" aria-label={dict.areas[g.area]} className={`min-w-0 ${cols.group}`}>
                    <div className="flex items-baseline gap-3 mb-5 md:mb-6 pb-3 border-b border-zinc-200 dark:border-white/10">
                      <Icon className={`w-5 h-5 self-center ${accent}`} aria-hidden />
                      <h3 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                        {dict.areas[g.area]}
                      </h3>
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">{count(g.items.length)}</span>
                    </div>
                    <ul className={`grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 ${cols.grid}`}>
                      {g.items.map((cert) => (
                        <li key={cert.id} className={cert.featured ? 'col-span-2' : ''}>
                          <CertCard cert={cert} dict={dict} onOpen={() => setActive(cert)} />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        <CertDialog cert={active} dict={dict} lang={lang} onClose={() => setActive(null)} />
      </section>
    </MotionConfig>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mt-1">{label}</dt>
      <dd className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  n,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  n: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black ${
        active
          ? 'bg-zinc-900 text-white dark:bg-white dark:text-black'
          : 'bg-[#f5f5f7] text-zinc-700 hover:bg-zinc-200 dark:bg-[#1c1c1e] dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {icon}
      {label}
      <span className={`tabular-nums text-xs ${active ? 'opacity-70' : 'text-zinc-500 dark:text-zinc-400'}`}>{n}</span>
    </button>
  );
}

// Tarjeta: el documento se muestra COMPLETO (object-contain sobre un paspartú
// neutro). Antes se recortaba a 16:9 con object-cover, y las imágenes van de
// 1:1 (insignias) a 1,5:1: se cortaban títulos y las insignias se ampliaban.
function CertCard({ cert, dict, onOpen }: { cert: Certification; dict: CertificationsDictionary; onOpen: () => void }) {
  const featured = !!cert.featured;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${dict.openDetails} ${cert.title}`}
      className={`group w-full h-full text-left rounded-[1.5rem] md:rounded-[1.75rem] bg-[#f5f5f7] dark:bg-[#111111] border border-zinc-200/80 dark:border-white/5 overflow-hidden flex transition-[transform,box-shadow] duration-500 motion-safe:hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-black ${
        featured ? 'flex-col sm:flex-row' : 'flex-col'
      }`}
    >
      <div
        className={`relative shrink-0 bg-white/60 dark:bg-white/[0.03] ${
          featured ? 'aspect-[4/3] sm:aspect-auto sm:w-[55%] sm:min-h-[15rem]' : 'aspect-[4/3]'
        }`}
      >
        <div className="absolute inset-3 md:inset-5">
          <Image
            src={cert.image}
            alt=""
            fill
            sizes={featured ? '(max-width: 768px) 100vw, 40vw' : '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'}
            className="object-contain drop-shadow-md transition-transform duration-700 motion-safe:group-hover:scale-[1.03]"
          />
        </div>
      </div>
      <div className={`flex flex-col gap-1.5 p-4 md:p-5 ${featured ? 'sm:justify-center sm:p-7' : ''}`}>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] md:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {cert.kind === 'badge' && <BadgeCheck className="w-3.5 h-3.5 text-apple-blue" aria-hidden />}
          {dict.kinds[cert.kind]}
          {featured && (
            <span className="rounded-full bg-zinc-900/5 dark:bg-white/10 px-2 py-0.5 normal-case tracking-normal text-zinc-700 dark:text-zinc-200">
              {dict.featured}
            </span>
          )}
        </span>
        <h4
          className={`font-semibold tracking-tight text-zinc-900 dark:text-white leading-snug ${
            featured ? 'text-lg md:text-2xl line-clamp-3' : 'text-sm md:text-base line-clamp-3'
          }`}
        >
          {cert.title}
        </h4>
        <p className="text-xs md:text-[13px] text-zinc-600 dark:text-zinc-400 line-clamp-2">{cert.issuer}</p>
        <p className="text-[11px] md:text-xs font-mono text-zinc-500">{cert.date}</p>
        {featured && (
          <p className="hidden sm:block mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-3">
            {cert.description}
          </p>
        )}
      </div>
    </button>
  );
}

// Ficha ampliada con <dialog> nativo: foco atrapado, Esc para cerrar y
// devolución del foco al disparador, sin dependencias.
function CertDialog({
  cert,
  dict,
  lang,
  onClose,
}: {
  cert: Certification | null;
  dict: CertificationsDictionary;
  lang: 'es' | 'en';
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // El sitio usa Lenis (scroll suave): bloquear `overflow` no basta, hay que
  // pausar su instancia mientras la ficha está abierta.
  const lenis = useLenis();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (cert && !el.open) {
      el.showModal();
      lenis?.stop();
      document.documentElement.style.overflow = 'hidden';
    } else if (!cert && el.open) {
      el.close();
    }
  }, [cert, lenis]);

  // Único punto de cierre (botón, Esc, clic fuera): restaura el scroll.
  const close = () => {
    lenis?.start();
    document.documentElement.style.overflow = '';
    onClose();
  };

  const area = cert ? AREA_VISUALS[cert.area] : null;

  return (
    <dialog
      ref={ref}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      aria-labelledby="cert-dialog-title"
      data-lenis-prevent
      className="m-auto w-[calc(100%-2rem)] max-w-5xl max-h-[90vh] p-0 rounded-[2rem] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-[cert-in_.35s_cubic-bezier(.16,1,.3,1)] motion-reduce:open:animate-none"
    >
      <style>{`@keyframes cert-in{from{opacity:0;transform:translateY(16px) scale(.98)}to{opacity:1;transform:none}}`}</style>
      {cert && area && (
        <div className="grid md:grid-cols-[1.25fr_1fr] max-h-[90vh] overflow-y-auto">
          <div className="relative bg-[#f5f5f7] dark:bg-black/40 aspect-[4/3] md:aspect-auto md:min-h-[28rem]">
            <div className="absolute inset-4 md:inset-8">
              <Image
                src={cert.image}
                alt={cert.title}
                fill
                sizes="(max-width: 768px) 100vw, 55vw"
                className="object-contain drop-shadow-lg"
              />
            </div>
          </div>
          <div className="relative p-6 md:p-10 flex flex-col">
            <button
              type="button"
              onClick={close}
              aria-label={dict.close}
              className="absolute top-4 right-4 md:top-6 md:right-6 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue"
            >
              <X size={18} />
            </button>
            <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3 pr-12 ${area.accent}`}>
              <area.icon className="w-4 h-4" aria-hidden /> {dict.areas[cert.area]}
            </p>
            <h3 id="cert-dialog-title" className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-6 pr-8">
              {cert.title}
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm mb-6">
              <dt className="text-zinc-500 dark:text-zinc-400">{dict.issuerLabel}</dt>
              <dd className="font-medium">{cert.issuer}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">{dict.dateLabel}</dt>
              <dd className="font-medium">{cert.date}</dd>
              <dt className="text-zinc-500 dark:text-zinc-400">{dict.typeLabel}</dt>
              <dd className="font-medium">{dict.kinds[cert.kind]}</dd>
            </dl>
            <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6">{cert.description}</p>
            {cert.tags?.length ? (
              <div className="flex flex-wrap gap-2 mb-6">
                {cert.tags.map((t) => (
                  <span
                    key={t.es}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    {t[lang]}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-2">
              {cert.verifyUrl && (
                <a
                  href={cert.verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black text-sm font-semibold"
                >
                  <BadgeCheck className="w-4 h-4" /> {dict.verify}
                </a>
              )}
              <a
                href={cert.image}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> {dict.viewFull}
              </a>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
