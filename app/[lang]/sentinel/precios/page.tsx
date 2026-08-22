import type { Metadata } from 'next';
import PricingPage from '@/components/sentra/PricingPage';
import { getDictionary } from '@/get-dictionary';
import { altLangs } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: 'es' | 'en' }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'es' ? 'Precios de Sentra' : 'Sentra Pricing',
    description:
      lang === 'es'
        ? 'Planes de Sentra: monitoreo continuo de seguridad, Security Score, reportes con IA y API. Empieza gratis.'
        : 'Sentra plans: continuous security monitoring, Security Score, AI reports and API. Start free.',
    alternates: altLangs('/sentinel/precios', lang),
  };
}

export default async function SentraPricingPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <PricingPage
      lang={lang}
      dict={dict.sentraPricing}
      upgradeDict={dict.sentraAuth.panel.upgrade_modal}
    />
  );
}
