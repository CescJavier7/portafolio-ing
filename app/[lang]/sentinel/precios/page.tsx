import type { Metadata } from 'next';
import PricingPage from '@/components/sentra/PricingPage';
import { getDictionary } from '@/get-dictionary';

export const metadata: Metadata = {
  title: 'Precios de Sentra',
  description: 'Planes de Sentra: monitoreo continuo de seguridad, Security Score, reportes con IA y API. Empieza gratis.',
};

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
