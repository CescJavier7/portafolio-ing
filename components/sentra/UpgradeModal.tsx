'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Check, X } from 'lucide-react';
import { sentraCreateCheckout } from '@/lib/sentra/api';

export interface UpgradeDict {
  title: string;
  subtitle: string;
  outOfScans: string;
  benefits: string[];
  price: string;
  cta: string;
  upgrading: string;
  later: string;
  testModeNote: string;
}

// Modal elegante que se abre cuando el usuario free se topa con un límite
// (escaneos agotados, tope de dominios). Vende Pro con la lista de ventajas
// y lanza el checkout de Lemon Squeezy.
export default function UpgradeModal({
  open,
  onClose,
  dict,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  dict: UpgradeDict;
  reason?: string; // mensaje contextual (ej. el detalle del 402)
}) {
  const [busy, setBusy] = useState(false);

  async function handleUpgrade() {
    setBusy(true);
    try {
      const url = await sentraCreateCheckout();
      window.location.href = url;
    } catch {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
          >
            {/* Cabecera con degradado dorado tipo "premium" */}
            <div className="relative px-7 pt-7 pb-6 bg-gradient-to-br from-amber-400/15 via-yellow-500/10 to-transparent">
              <button onClick={onClose} className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                <Gem className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">{dict.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{dict.subtitle}</p>
            </div>

            <div className="px-7 pb-7">
              {reason && (
                <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
                  {reason}
                </p>
              )}

              <ul className="space-y-2.5 mb-6">
                {dict.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-green-500/15 flex items-center justify-center">
                      <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleUpgrade}
                disabled={busy}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-amber-500/20"
              >
                {busy ? dict.upgrading : `${dict.cta} — ${dict.price}`}
              </button>
              <button
                onClick={onClose}
                className="w-full mt-2 py-2.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                {dict.later}
              </button>
              <p className="text-[11px] text-center text-zinc-400 dark:text-zinc-500 mt-2">{dict.testModeNote}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
