import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getDictionary } from '@/get-dictionary';
import { altLangs } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: 'es' | 'en' }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'es' ? 'Términos del Servicio' : 'Terms of Service',
    description: lang === 'es' ? 'Términos y condiciones de uso de Sentra.' : 'Terms and conditions of use of Sentra.',
    alternates: altLangs('/legal/terminos', lang),
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <LegalPage dict={dict.legal.terms} />;
}
