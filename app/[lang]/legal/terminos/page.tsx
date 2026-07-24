import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getDictionary } from '@/get-dictionary';

export const metadata: Metadata = {
  title: 'Términos del Servicio',
  description: 'Términos y condiciones de uso de Sentra.',
};

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <LegalPage dict={dict.legal.terms} />;
}
