import { Suspense } from 'react';
import AcceptInvite from '@/components/sentra/AcceptInvite';
import { getDictionary } from '@/get-dictionary';

export const metadata = { robots: { index: false, follow: false } };

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);

  return (
    <Suspense fallback={null}>
      <AcceptInvite lang={lang} dict={dict.sentraAuth.acceptInvite} />
    </Suspense>
  );
}
