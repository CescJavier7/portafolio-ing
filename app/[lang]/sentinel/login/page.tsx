import SentraLogin from '@/components/sentra/SentraLogin';
import { getDictionary } from '@/get-dictionary';

export const metadata = { robots: { index: false, follow: false } };

export default async function SentraLoginPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return <SentraLogin lang={lang} dict={dict.sentraAuth.login} />;
}
