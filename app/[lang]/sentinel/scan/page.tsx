import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicScan from '@/components/sentra/PublicScan';
import { getDictionary } from '@/get-dictionary';

export const metadata: Metadata = {
  title: 'Escaneo de seguridad gratis',
  description: 'Escanea la seguridad de tu dominio gratis y sin registro: headers, TLS, DNS, SPF/DMARC y un Security Score al instante.',
};

export default async function PublicScanPage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <Suspense fallback={null}>
      <PublicScan lang={lang} dict={dict.sentraFreeScan} />
    </Suspense>
  );
}
