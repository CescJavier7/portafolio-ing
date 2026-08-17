'use client';

import { useEffect, useState } from 'react';
import { Check, X, Loader2, Inbox, Wallet } from 'lucide-react';
import {
  sentraPendingPayments,
  sentraApprovePayment,
  sentraRejectPayment,
  type SentraPendingPayment,
} from '@/lib/sentra/api';

const METHOD_LABEL: Record<string, string> = {
  deuna: 'De Una',
  payphone: 'PayPhone',
  transfer: 'Transferencia',
  paypal: 'PayPal',
  usdt: 'USDT',
};

// Panel del FUNDADOR: aprueba/rechaza pagos manuales. Se auto-oculta si el
// endpoint /pending devuelve 403 (usuario no fundador), así puede vivir en el
// panel general sin filtrar su existencia a los demás.
export default function FounderPayments() {
  const [items, setItems] = useState<SentraPendingPayment[] | null>(null);
  const [isFounder, setIsFounder] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    sentraPendingPayments()
      .then((data) => {
        if (!alive) return;
        setIsFounder(true);
        setItems(data);
      })
      .catch(() => {
        if (alive) setIsFounder(false); // 403 = no fundador → no se renderiza
      });
    return () => {
      alive = false;
    };
  }, []);

  async function act(id: string, action: 'approve' | 'reject') {
    setBusyId(id);
    try {
      if (action === 'approve') await sentraApprovePayment(id);
      else await sentraRejectPayment(id);
      setItems((prev) => (prev ?? []).filter((p) => p.id !== id));
    } catch {
      /* noop */
    } finally {
      setBusyId(null);
    }
  }

  if (!isFounder) return null;

  return (
    <section className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-7">
      <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-4">
        <Wallet className="w-5 h-5 text-green-500" /> Pagos por aprobar
        {items && items.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-green-500 text-black text-[12px] font-black">
            {items.length}
          </span>
        )}
      </h2>

      {items === null ? (
        <p className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
        </p>
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500 py-4">
          <Inbox className="w-4 h-4" /> No hay pagos pendientes.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{p.organization_name}</p>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400 truncate">{p.user_email}</p>
                  <p className="text-[13px] text-zinc-700 dark:text-zinc-300 mt-1.5">
                    <span className="font-semibold">{p.plan}</span> · {p.amount || '—'} ·{' '}
                    {METHOD_LABEL[p.method] ?? p.method}
                  </p>
                  <p className="text-[13px] text-zinc-700 dark:text-zinc-300">
                    Ref: <span className="font-mono">{p.reference}</span>
                  </p>
                  {p.note && <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5">{p.note}</p>}
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => act(p.id, 'approve')}
                    disabled={busyId === p.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-green-500 text-black text-[13px] font-bold hover:brightness-105 disabled:opacity-50"
                  >
                    {busyId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Aprobar
                  </button>
                  <button
                    onClick={() => act(p.id, 'reject')}
                    disabled={busyId === p.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-[13px] font-semibold hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> Rechazar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
