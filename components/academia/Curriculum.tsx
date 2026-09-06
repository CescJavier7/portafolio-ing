'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Lock, PlayCircle, Clock, Award } from 'lucide-react';
import { sentraGetAccessToken, sentraGetAcademyProgress } from '@/lib/sentra/api';
import type { LessonMeta } from '@/lib/academia';

interface ModuleGroup {
  module: string;
  lessons: LessonMeta[];
}

export default function Curriculum({
  trackSlug,
  trackTitle,
  trackDesc,
  modules,
  lang,
}: {
  trackSlug: string;
  trackTitle: string;
  trackDesc: string;
  modules: ModuleGroup[];
  lang: string;
}) {
  const en = lang === 'en';
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sentraGetAccessToken()) return;
    sentraGetAcademyProgress()
      .then((p) => setCompleted(new Set(p.completed)))
      .catch(() => {});
  }, []);

  const allLessons = modules.flatMap((m) => m.lessons);
  const doneCount = allLessons.filter((l) => completed.has(`${trackSlug}/${l.slug}`)).length;
  const pct = allLessons.length ? Math.round((doneCount / allLessons.length) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">
      <Link href={`/${lang}/academia`} className="text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline">
        ← {en ? 'Academy' : 'Academia'}
      </Link>
      <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white mt-3 mb-2">{trackTitle}</h1>
      <p className="text-[15px] text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">{trackDesc}</p>

      {/* Barra de progreso */}
      <div className="flex items-center gap-3 mb-10">
        <div className="flex-1 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        <span className="text-[12px] font-bold tabular-nums text-zinc-500 dark:text-zinc-400">
          {doneCount}/{allLessons.length} · {pct}%
        </span>
      </div>

      {/* Ruta completa → certificado. Solo aparece al 100% (lo que implica sesión). */}
      {allLessons.length > 0 && doneCount === allLessons.length && (
        <Link
          href={`/${lang}/academia/${trackSlug}/certificado`}
          className="flex items-center gap-4 rounded-3xl border border-green-500/40 bg-gradient-to-r from-green-500/10 to-transparent p-5 mb-10 hover:border-green-500 transition-colors"
        >
          <span className="w-11 h-11 shrink-0 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-black text-zinc-900 dark:text-white">
              {en ? 'Track completed — get your certificate' : 'Ruta completada — obtén tu certificado'}
            </p>
            <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {en ? 'Verifiable, signed, ready to share.' : 'Verificable, firmado y listo para compartir.'}
            </p>
          </div>
          <span className="text-green-600 dark:text-green-400 shrink-0">→</span>
        </Link>
      )}

      {modules.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">{en ? 'Content coming soon.' : 'Contenido en producción.'}</p>
      ) : (
        <div className="space-y-10">
          {modules.map((m) => (
            <section key={m.module}>
              <h2 className="text-[12px] font-black uppercase tracking-[0.12em] text-zinc-400 mb-3">{m.module}</h2>
              <ul className="space-y-2">
                {m.lessons.map((l) => {
                  const isDone = completed.has(`${trackSlug}/${l.slug}`);
                  return (
                    <li key={l.slug}>
                      <Link
                        href={`/${lang}/academia/${trackSlug}/${l.slug}`}
                        className="group flex items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 px-4 py-3.5 hover:border-green-400 transition-colors"
                      >
                        <span
                          className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                            isDone ? 'bg-green-500 text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {isDone ? <Check className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-bold text-zinc-900 dark:text-white truncate">{l.title}</p>
                          {l.description && (
                            <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 truncate">{l.description}</p>
                          )}
                        </div>
                        {l.duration && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400 shrink-0">
                            <Clock className="w-3 h-3" /> {l.duration}
                          </span>
                        )}
                        {l.access === 'pro' ? (
                          <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-green-600 dark:text-green-400 shrink-0">
                            {en ? 'Free' : 'Gratis'}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
