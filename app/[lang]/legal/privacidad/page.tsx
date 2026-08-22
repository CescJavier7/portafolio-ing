import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { getDictionary } from '@/get-dictionary';
import { altLangs } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: 'es' | 'en' }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'es' ? 'Política de Privacidad' : 'Privacy Policy',
    description: lang === 'es' ? 'Cómo Sentra recopila, usa y protege tus datos.' : 'How Sentra collects, uses and protects your data.',
    alternates: altLangs('/legal/privacidad', lang),
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <LegalPage dict={dict.legal.privacy} />;
}
