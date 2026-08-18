import type { Metadata } from 'next';
import { Suspense } from 'react';
import PayphoneConfirm from '@/components/sentra/PayphoneConfirm';

// Página de RETORNO de PayPhone (Botón de Pago por redirección). PayPhone
// redirige aquí con ?id=&clientTransactionId= tras el pago; el componente
// confirma contra el backend y activa el plan. noindex: es un paso de checkout.
export const metadata: Metadata = {
  title: 'Confirmando pago — Sentra',
  robots: { index: false, follow: false },
};

export default async function PagoConfirmarPage({ params }: { params: Promise<{ lang: 'es' | 'en' }> }) {
  const { lang } = await params;
  return (
    <Suspense fallback={null}>
      <PayphoneConfirm lang={lang} />
    </Suspense>
  );
}
