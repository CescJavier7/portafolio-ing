import SentraPanel from '@/components/sentra/SentraPanel';
import { getDictionary } from '@/get-dictionary';

export default async function SentraPanelPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  // El guard de sesión es client-side (SentraPanel): la sesión vive en el
  // navegador (sessionStorage + cookie de refresh del dominio de la API),
  // el servidor de Next.js no la conoce.
  return <SentraPanel lang={lang} dict={dict.sentraAuth.panel} />;
}
