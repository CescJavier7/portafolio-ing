import type { Metadata } from 'next';
import SecurityPage from '@/components/sentra/SecurityPage';
import { getDictionary } from '@/get-dictionary';
import { altLangs } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: 'es' | 'en' }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'es' ? 'Seguridad de Sentra' : 'Sentra Security',
    description:
      lang === 'es'
        ? 'Cómo protegemos Sentra y tus datos: cifrado, control de acceso, aislamiento y divulgación responsable.'
        : 'How we protect Sentra and your data: encryption, access control, isolation and responsible disclosure.',
    alternates: altLangs('/sentinel/seguridad', lang),
  };
}

export default async function SentraSecurityPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <SecurityPage dict={dict.sentraSecurity} />;
}
