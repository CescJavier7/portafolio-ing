import SentraRegister from '@/components/sentra/SentraRegister';
import { getDictionary } from '@/get-dictionary';

export const metadata = { robots: { index: false, follow: false } };

export default async function SentraRegisterPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <SentraRegister lang={lang} dict={dict.sentraAuth.register} />;
}
