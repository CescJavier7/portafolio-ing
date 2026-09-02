import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TRACKS, getTrackMeta, getTrackModules, type Lang } from '@/lib/academia';
import Curriculum from '@/components/academia/Curriculum';
import { altLangs } from '@/lib/seo';

export function generateStaticParams() {
  const out: { lang: string; track: string }[] = [];
  for (const lang of ['es', 'en']) for (const t of TRACKS) out.push({ lang, track: t.slug });
  return out;
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; track: string }> }): Promise<Metadata> {
  const { lang, track } = await params;
  const meta = getTrackMeta(track);
  if (!meta) return {};
  const l = (lang === 'en' ? 'en' : 'es') as Lang;
  return {
    title: `${meta.title[l]} — Academia`,
    description: meta.desc[l],
    alternates: altLangs(`/academia/${track}`, lang),
  };
}

export default async function TrackPage({ params }: { params: Promise<{ lang: string; track: string }> }) {
  const { lang, track } = await params;
  const meta = getTrackMeta(track);
  if (!meta) notFound();
  const l = (lang === 'en' ? 'en' : 'es') as Lang;
  const modules = getTrackModules(track, l);
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Curriculum trackSlug={track} trackTitle={meta.title[l]} trackDesc={meta.desc[l]} modules={modules} lang={l} />
    </div>
  );
}
