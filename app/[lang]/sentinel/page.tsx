import SentinelLanding from '@/components/SentinelLanding';
import { getDictionary } from '@/get-dictionary';

export default async function SentinelPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  // NavBar y Footer ya los renderiza app/[lang]/layout.tsx: aquí solo va el contenido de la página.
  return <SentinelLanding lang={lang} dict={dict.sentinel} />;
}