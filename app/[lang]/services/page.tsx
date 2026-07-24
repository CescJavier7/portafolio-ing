import type { Metadata } from 'next';
import ServicesApple from '@/components/ServicesApple';
import { getDictionary } from '@/get-dictionary';

const BASE = 'https://cescjavier.dev';

const SEO = {
  es: {
    title: 'Servicios · Desarrollo de software, ciberseguridad y docencia',
    description:
      'Desarrollo web fullstack (Next.js, FastAPI), auditorías de seguridad web y hardening de infraestructura, y docencia en informática y matemáticas. Ingeniería con seguridad desde el diseño.',
    keywords: [
      'servicios de desarrollo de software',
      'desarrollo web Ecuador',
      'auditoría de seguridad web',
      'servicios de ciberseguridad',
      'pentesting',
      'hardening de servidores',
      'clases de programación',
      'tutorías de ciberseguridad',
      'asesoría de tesis informática',
    ],
  },
  en: {
    title: 'Services · Software development, cybersecurity and teaching',
    description:
      'Fullstack web development (Next.js, FastAPI), web security audits and infrastructure hardening, and computer science and math tutoring. Engineering with security by design.',
    keywords: [
      'software development services',
      'web development',
      'web security audit',
      'cybersecurity services',
      'pentesting',
      'server hardening',
      'programming classes',
      'cybersecurity tutoring',
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
  const url = `${BASE}/${lang}/services`;

  return {
    title: { absolute: s.title },
    description: s.description,
    keywords: [...s.keywords],
    alternates: {
      canonical: url,
      languages: { es: `${BASE}/es/services`, en: `${BASE}/en/services` },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Kevin Montatixe',
      title: s.title,
      description: s.description,
      locale: lang === 'es' ? 'es_EC' : 'en_US',
    },
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const s = SEO[lang] ?? SEO.es;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'Kevin Montatixe — Ingeniería de Software y Ciberseguridad',
    url: `${BASE}/${lang}/services`,
    description: s.description,
    areaServed: lang === 'es' ? 'Ecuador y remoto' : 'Ecuador and remote',
    provider: { '@type': 'Person', name: 'Kevin Javier Montatixe' },
    knowsAbout: [
      'Cybersecurity',
      'Web development',
      'DevSecOps',
      'Pentesting',
      'Next.js',
      'FastAPI',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ServicesApple lang={lang} dict={dict.services} />
    </>
  );
}
