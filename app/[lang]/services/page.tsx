import ServicesApple from '@/components/ServicesApple';
import { getDictionary } from '@/get-dictionary';

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  // NavBar y Footer ya los renderiza app/[lang]/layout.tsx: aquí solo va el contenido de la página.
  return <ServicesApple lang={lang} dict={dict.services} />;
}