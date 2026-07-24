import type { Metadata } from 'next';
import SecurityPage from '@/components/sentra/SecurityPage';
import { getDictionary } from '@/get-dictionary';

export const metadata: Metadata = {
  title: 'Seguridad de Sentra',
  description: 'Cómo protegemos Sentra y tus datos: cifrado, control de acceso, aislamiento y divulgación responsable.',
};

export default async function SentraSecurityPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <SecurityPage dict={dict.sentraSecurity} />;
}
