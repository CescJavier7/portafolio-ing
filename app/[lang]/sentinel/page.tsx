import type { Metadata } from 'next';
import SentinelLanding from '@/components/SentinelLanding';
import { getDictionary } from '@/get-dictionary';

const BASE = 'https://cescjavier.dev';

// SEO por idioma. Títulos "absolute" para que NO se les pegue el
// "| Kevin Montatixe" del template global: aquí queremos que la marca y las
// keywords del producto manden.
const SEO = {
  es: {
    title: 'Sentra · Escanea y vigila la seguridad de tu web 24/7',
    description:
      '¿Qué tan segura es tu página web? Sentra te da un Security Score al instante y vigila tu dominio las 24 horas: SSL/TLS, cabeceras, DNS, SPF y DMARC. Empieza gratis, sin tarjeta.',
    keywords: [
      'escanear seguridad página web',
      'seguridad de sitio web',
      'auditoría de seguridad web',
      'escáner de seguridad web',
      'security score',
      'monitoreo de seguridad web',
      'revisar SSL TLS',
      'cabeceras de seguridad',
      'SPF DMARC',
      'seguridad web gratis',
    ],
  },
  en: {
    title: 'Sentra · Scan and monitor your website security 24/7',
    description:
      'How secure is your website? Sentra gives you an instant Security Score and monitors your domain 24/7: SSL/TLS, headers, DNS, SPF and DMARC. Start free, no card.',
    keywords: [
      'website security scanner',
      'scan website security',
      'website security check',
      'security score',
      'continuous security monitoring',
      'SSL TLS check',
      'security headers checker',
      'SPF DMARC check',
      'free website security',
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
  const url = `${BASE}/${lang}/sentinel`;

  return {
    title: { absolute: s.title },
    description: s.description,
    keywords: [...s.keywords],
    alternates: {
      canonical: url,
      languages: {
        es: `${BASE}/es/sentinel`,
        en: `${BASE}/en/sentinel`,
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

export default async function SentinelPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const s = SEO[lang] ?? SEO.es;

  // Datos estructurados: le dicen a Google que esto es una aplicación de
  // seguridad gratuita → habilita resultados enriquecidos.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Sentra',
    url: `${BASE}/${lang}/sentinel`,
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Web',
    description: s.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: [
      lang === 'es' ? 'Security Score 0-100' : 'Security Score 0-100',
      lang === 'es' ? 'Monitoreo continuo con alertas' : 'Continuous monitoring with alerts',
      lang === 'es' ? 'Análisis de SSL/TLS, cabeceras, DNS, SPF y DMARC' : 'SSL/TLS, headers, DNS, SPF and DMARC analysis',
      lang === 'es' ? 'Informes con IA y exportación a PDF' : 'AI reports and PDF export',
    ],
    author: { '@type': 'Person', name: 'Kevin Javier Montatixe' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SentinelLanding lang={lang} dict={dict.sentinel} />
    </>
  );
}
