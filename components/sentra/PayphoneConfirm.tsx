'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, LayoutDashboard, RefreshCw } from 'lucide-react';
import { sentraPayphoneConfirm, SENTRA_AUTH_EVENT } from '@/lib/sentra/api';

type State = 'confirming' | 'approved' | 'rejected' | 'error' | 'missing';

const T = {
  es: {
    confirming: 'Confirmando tu pago…',
    confirmingSub: 'No cierres esta página. Toma unos segundos.',
    approved: '¡Pago confirmado!',
    approvedSub: 'Tu plan Pro ya está activo. Gracias por apoyar Sentra.',
    rejected: 'No se pudo confirmar el pago',
    rejectedSub: 'El pago fue cancelado o no se completó. No se te cobró. Puedes intentarlo de nuevo.',
    error: 'Hubo un problema al confirmar',
    errorSub: 'Si el cobro se realizó, se activará en breve. Escríbenos si no ves tu plan Pro en unos minutos.',
    missing: 'Falta información del pago',
    missingSub: 'Abre el pago desde el botón «Pagar con tarjeta» en tu panel.',
    panel: 'Ir a tu panel',
    retry: 'Reintentar',
  },
  en: {
    confirming: 'Confirming your payment…',
    confirmingSub: "Don't close this page. It takes a few seconds.",
    approved: 'Payment confirmed!',
    approvedSub: 'Your Pro plan is now active. Thanks for supporting Sentra.',
    rejected: 'Could not confirm the payment',
    rejectedSub: 'The payment was cancelled or not completed. You were not charged. You can try again.',
    error: 'There was a problem confirming',
    errorSub: 'If the charge went through, it will activate shortly. Write to us if you do not see Pro in a few minutes.',
    missing: 'Missing payment information',
    missingSub: 'Start the payment from the “Pay by card” button in your panel.',
    panel: 'Go to your panel',
    retry: 'Try again',
  },
};

export default function PayphoneConfirm({ lang }: { lang: 'es' | 'en' }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const params = useSearchParams();
  const id = params.get('id');
  const clientTransactionId = params.get('clientTransactionId');
  const [state, setState] = useState<State>('confirming');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // evita doble POST (React strict mode)
    ran.current = true;

    if (!id || !clientTransactionId) {
      setState('missing');
      return;
    }

    sentraPayphoneConfirm(Number(id), clientTransactionId)
      .then((res) => {
        if (res.status === 'approved') {
          setState('approved');
          // Refresca la sesión para que el badge/plan se actualicen sin recargar.
          window.dispatchEvent(new Event(SENTRA_AUTH_EVENT));
        } else {
          setState('rejected');
        }
      })
      .catch(() => setState('error'));
  }, [id, clientTransactionId]);

  const icon =
    state === 'approved' ? (
      <CheckCircle2 className="w-8 h-8 text-green-500" />
    ) : state === 'confirming' ? (
      <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
    ) : (
      <XCircle className="w-8 h-8 text-amber-500" />
    );

  const title =
    state === 'approved' ? t.approved : state === 'confirming' ? t.confirming : state === 'rejected' ? t.rejected : state === 'missing' ? t.missing : t.error;
  const sub =
    state === 'approved' ? t.approvedSub : state === 'confirming' ? t.confirmingSub : state === 'rejected' ? t.rejectedSub : state === 'missing' ? t.missingSub : t.errorSub;

  return (
    <section className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
          {icon}
        </div>
        <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">{title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-7">{sub}</p>

        {state !== 'confirming' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/${lang}/sentinel/panel`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <LayoutDashboard className="w-4 h-4" /> {t.panel}
            </Link>
            {(state === 'rejected' || state === 'error') && (
              <Link
                href={`/${lang}/sentinel/precios`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> {t.retry}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
