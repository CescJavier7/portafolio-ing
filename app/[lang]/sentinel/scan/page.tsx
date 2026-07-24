import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicScan from '@/components/sentra/PublicScan';
import { getDictionary } from '@/get-dictionary';

const BASE = 'https://cescjavier.dev';

const SEO = {
  es: {
    title: 'Escáner de seguridad web gratis · Analiza tu dominio en segundos',
    description:
      'Escanea la seguridad de tu página web gratis y sin registro. Security Score al instante: SSL/TLS, cabeceras, DNS, SPF y DMARC. 100% pasivo — no atacamos nada.',
    keywords: [
      'escáner de seguridad web gratis',
      'escanear seguridad página web',
      'analizar seguridad de mi web',
      'test de seguridad web',
      'comprobar SSL de mi web',
      'revisar cabeceras de seguridad',
      'security score gratis',
      'verificar SPF DMARC',
    ],
  },
  en: {
    title: 'Free website security scanner · Check your domain in seconds',
    description:
      'Scan your website security for free, no signup. Instant Security Score: SSL/TLS, headers, DNS, SPF and DMARC. 100% passive — we attack nothing.',
    keywords: [
      'free website security scanner',
      'scan website security',
      'check my website security',
      'website security test',
      'check SSL of my site',
      'security headers checker',
      'free security score',
      'SPF DMARC checker',
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
  const url = `${BASE}/${lang}/sentinel/scan`;

  return {
    title: { absolute: s.title },
    description: s.description,
    keywords: [...s.keywords],
    alternates: {
      canonical: url,
      languages: {
        es: `${BASE}/es/sentinel/scan`,
        en: `${BASE}/en/sentinel/scan`,
      },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Sentra',
      title: s.title,
      description: s.description,
      locale: lang === 'es' ? 'es_EC' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: s.title,
      description: s.description,
    },
  };
}

export default async function PublicScanPage({
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
    name: lang === 'es' ? 'Sentra — Escáner de seguridad web' : 'Sentra — Website security scanner',
    url: `${BASE}/${lang}/sentinel/scan`,
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web',
    description: s.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    author: { '@type': 'Person', name: 'Kevin Javier Montatixe' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <PublicScan lang={lang} dict={dict.sentraFreeScan} />
      </Suspense>
    </>
  );
}
