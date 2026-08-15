import type { Metadata } from 'next';
import CVGenerator from '@/components/tools/CVGenerator';
import { getDictionary } from '@/get-dictionary';

const BASE = 'https://cescjavier.dev';

const SEO = {
  es: {
    title: 'Generador de CV con IA · Adapta tu currículum a cada oferta',
    description:
      'Crea un CV a la medida de cada oferta laboral con IA: pega o sube una foto de la oferta y obtén tu currículum adaptado, con match score y sugerencias. Gratis con tu cuenta.',
    keywords: [
      'generador de CV con IA',
      'crear currículum con inteligencia artificial',
      'adaptar CV a oferta de trabajo',
      'hacer un CV online gratis',
      'currículum a la medida',
      'CV para postular a un empleo',
      'plantilla de CV en PDF',
      'match CV oferta laboral',
    ],
  },
  en: {
    title: 'AI Resume Builder · Tailor your CV to each job posting',
    description:
      'Build a resume tailored to each job posting with AI: paste or upload a photo of the offer and get your adapted CV, with a match score and suggestions. Free with your account.',
    keywords: [
      'AI resume builder',
      'create CV with artificial intelligence',
      'tailor resume to job posting',
      'free online CV maker',
      'custom resume',
      'resume for job application',
      'CV PDF template',
      'resume job match',
    ],
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const s = SEO[lang] ?? SEO.es;
  const url = `${BASE}/${lang}/herramientas/cv`;

  return {
    title: { absolute: s.title },
    description: s.description,
    keywords: [...s.keywords],
    alternates: {
      canonical: url,
      languages: { es: `${BASE}/es/herramientas/cv`, en: `${BASE}/en/herramientas/cv` },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Kevin Montatixe',
      title: s.title,
      description: s.description,
      locale: lang === 'es' ? 'es_EC' : 'en_US',
    },
    twitter: { card: 'summary_large_image', title: s.title, description: s.description },
  };
}

export default async function CVToolPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const s = SEO[lang] ?? SEO.es;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: lang === 'es' ? 'Generador de CV con IA' : 'AI Resume Builder',
    url: `${BASE}/${lang}/herramientas/cv`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: s.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Kevin Javier Montatixe' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CVGenerator lang={lang} dict={dict.cvTool} />
    </>
  );
}
