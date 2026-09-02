import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock, Lock } from 'lucide-react';
import {
  getLesson,
  getAdjacentLessons,
  getAllLessonParams,
  getTrackMeta,
  type Lang,
} from '@/lib/academia';
import LessonMarkdown from '@/components/academia/LessonMarkdown';
import ProLessonBody from '@/components/academia/ProLessonBody';
import LessonComplete from '@/components/academia/LessonComplete';
import { altLangs } from '@/lib/seo';

export function generateStaticParams() {
  return getAllLessonParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; track: string; lesson: string }>;
}): Promise<Metadata> {
  const { lang, track, lesson } = await params;
  const l = (lang === 'en' ? 'en' : 'es') as Lang;
  const data = getLesson(track, lesson, l);
  if (!data) return {};
  return {
    title: `${data.title} — Academia`,
    description: data.description,
    alternates: altLangs(`/academia/${track}/${lesson}`, lang),
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lang: string; track: string; lesson: string }>;
}) {
  const { lang, track, lesson } = await params;
  const l = (lang === 'en' ? 'en' : 'es') as Lang;
  const data = getLesson(track, lesson, l);
  if (!data) notFound();

  const trackMeta = getTrackMeta(track);
  const { prev, next } = getAdjacentLessons(track, lesson, l);
  const en = l === 'en';
  const slug = `${track}/${lesson}`;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <article className="max-w-3xl mx-auto px-4 pt-28 pb-20">
        <Link
          href={`/${l}/academia/${track}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {trackMeta?.title[l] ?? 'Academia'}
        </Link>

        <header className="mt-4 mb-8">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-green-600 dark:text-green-400 mb-2">{data.module}</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white leading-tight">{data.title}</h1>
          <div className="flex items-center gap-4 mt-3 text-[13px] text-zinc-400">
            {data.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {data.duration}
              </span>
            )}
            {data.access === 'pro' && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <Lock className="w-3.5 h-3.5" /> Pro
              </span>
            )}
          </div>
        </header>

        {/* Cuerpo: free se renderiza en el servidor (SEO); pro se pide autenticado. */}
        {data.access === 'free' ? (
          <LessonMarkdown content={data.content} />
        ) : (
          <ProLessonBody track={track} lesson={lesson} lang={l} />
        )}

        <div className="mt-14 pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <LessonComplete slug={slug} lang={l} />
        </div>

        <nav className="mt-8 grid grid-cols-2 gap-3">
          {prev ? (
            <Link
              href={`/${l}/academia/${track}/${prev.slug}`}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-green-400 transition-colors"
            >
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-zinc-400">
                <ArrowLeft className="w-3 h-3" /> {en ? 'Previous' : 'Anterior'}
              </span>
              <span className="block text-[14px] font-bold text-zinc-900 dark:text-white mt-1 truncate">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/${l}/academia/${track}/${next.slug}`}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 hover:border-green-400 transition-colors text-right"
            >
              <span className="flex items-center justify-end gap-1 text-[11px] font-bold uppercase text-zinc-400">
                {en ? 'Next' : 'Siguiente'} <ArrowRight className="w-3 h-3" />
              </span>
              <span className="block text-[14px] font-bold text-zinc-900 dark:text-white mt-1 truncate">{next.title}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>
    </div>
  );
}
