import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TRACKS, getTrackMeta, type Lang } from '@/lib/academia';
import CertificateView from '@/components/academia/CertificateView';

export function generateStaticParams() {
  const out: { lang: string; track: string }[] = [];
  for (const lang of ['es', 'en']) for (const t of TRACKS) out.push({ lang, track: t.slug });
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; track: string }>;
}): Promise<Metadata> {
  const { lang, track } = await params;
  const meta = getTrackMeta(track);
  if (!meta) return {};
  const l = (lang === 'en' ? 'en' : 'es') as Lang;
  return {
    title: `${l === 'en' ? 'Certificate' : 'Certificado'} — ${meta.title[l]}`,
    // Página personal (o de verificación de un código concreto): fuera del índice.
    robots: { index: false, follow: false },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ lang: string; track: string }>;
}) {
  const { lang, track } = await params;
  const meta = getTrackMeta(track);
  if (!meta) notFound();
  const l = (lang === 'en' ? 'en' : 'es') as Lang;

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Suspense: la vista lee ?code con useSearchParams. */}
      <Suspense fallback={null}>
        <CertificateView track={track} trackTitle={meta.title[l]} lang={l} />
      </Suspense>
    </div>
  );
}
