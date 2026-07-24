import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getDictionary } from '@/get-dictionary';

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Cómo Sentra recopila, usa y protege tus datos.',
};

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <LegalPage dict={dict.legal.privacy} />;
}
