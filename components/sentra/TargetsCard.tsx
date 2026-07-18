'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Plus, ShieldCheck, ShieldAlert, Trash2, Copy, Check, X } from 'lucide-react';
import {
  sentraCreateTarget,
  sentraDeleteTarget,
  sentraGetInstructions,
  sentraListTargets,
  sentraVerifyTarget,
  SentraApiError,
  type SentraTarget,
  type SentraTargetCreated,
} from '@/lib/sentra/api';

export interface TargetsDict {
  title: string;
  desc: string;
  addPlaceholder: string;
  add: string;
  adding: string;
  empty: string;
  verified: string;
  pending: string;
  verify: string;
  verifying: string;
  delete: string;
  instructionsTitle: string;
  instructionsIntro: string;
  recordType: string;
  recordName: string;
  recordValue: string;
  copy: string;
  copied: string;
  close: string;
  scanSoon: string;
}

const inputClass =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition';

function CopyField({ label, value, copyLabel, copiedLabel }: { label: string; value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[13px] text-zinc-800 dark:text-zinc-200">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}

export default function TargetsCard({ dict }: { dict: TargetsDict }) {
  const [targets, setTargets] = useState<SentraTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<SentraTargetCreated | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  useEffect(() => {
    sentraListTargets()
      .then(setTargets)
      .catch(() => setTargets([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const created = await sentraCreateTarget(domain);
      setTargets((prev) => [created, ...prev]);
      setDomain('');
      setInstructions(created); // abre el modal con el registro TXT a publicar
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    setVerifyMsg(null);
    try {
      const res = await sentraVerifyTarget(id);
      setVerifyMsg({ id, ok: res.verified, text: res.detail });
      if (res.verified) {
        setTargets((prev) =>
          prev.map((t) => (t.id === id ? { ...t, verified: true, verified_at: new Date().toISOString() } : t)),
        );
        setInstructions(null);
      }
    } catch (err) {
      setVerifyMsg({ id, ok: false, text: err instanceof SentraApiError ? err.detail : 'Error de conexión.' });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    try {
      await sentraDeleteTarget(id);
    } catch {
      // Si falla el borrado remoto, recargamos para no mentir en la UI.
      sentraListTargets().then(setTargets).catch(() => {});
    }
  }

  async function openInstructions(id: string) {
    try {
      setInstructions(await sentraGetInstructions(id));
    } catch {
      /* noop */
    }
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 mt-6">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Globe className="w-5 h-5 text-green-500" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{dict.title}</h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{dict.desc}</p>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          required
          placeholder={dict.addPlaceholder}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className={inputClass}
        />
        <button
          type="submit"
          disabled={adding}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          <Plus className="w-4 h-4" /> {adding ? dict.adding : dict.add}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-4">…</p>
      ) : targets.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4 text-center">{dict.empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {targets.map((t) => (
            <li key={t.id} className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{t.domain}</p>
                <span
                  className={`inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold ${
                    t.verified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {t.verified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                  {t.verified ? dict.verified : dict.pending}
                </span>
                {verifyMsg?.id === t.id && (
                  <p className={`text-[12px] mt-1 ${verifyMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {verifyMsg.text}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.verified ? (
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">{dict.scanSoon}</span>
                ) : (
                  <>
                    <button
                      onClick={() => openInstructions(t.id)}
                      className="px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                    >
                      DNS
                    </button>
                    <button
                      onClick={() => handleVerify(t.id)}
                      disabled={verifyingId === t.id}
                      className="px-3 py-1.5 rounded-full bg-green-500 text-black text-[12px] font-bold hover:scale-105 transition-transform disabled:opacity-60"
                    >
                      {verifyingId === t.id ? dict.verifying : dict.verify}
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleDelete(t.id)}
                  aria-label={dict.delete}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal de instrucciones DNS */}
      <AnimatePresence>
        {instructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setInstructions(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-7"
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                  {dict.instructionsTitle}
                </h3>
                <button onClick={() => setInstructions(null)} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm font-mono text-green-600 dark:text-green-400 mb-1">{instructions.domain}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{dict.instructionsIntro}</p>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">{dict.recordType}</p>
                  <code className="inline-block rounded-lg bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[13px] text-zinc-800 dark:text-zinc-200">TXT</code>
                </div>
                <CopyField label={dict.recordName} value={instructions.dns_record_name} copyLabel={dict.copy} copiedLabel={dict.copied} />
                <CopyField label={dict.recordValue} value={instructions.dns_record_value} copyLabel={dict.copy} copiedLabel={dict.copied} />
              </div>

              <div className="flex gap-3 mt-7">
                <button
                  onClick={() => handleVerify(instructions.id)}
                  disabled={verifyingId === instructions.id}
                  className="flex-1 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] transition-transform disabled:opacity-60"
                >
                  {verifyingId === instructions.id ? dict.verifying : dict.verify}
                </button>
                <button
                  onClick={() => setInstructions(null)}
                  className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
                >
                  {dict.close}
                </button>
              </div>
              {verifyMsg?.id === instructions.id && !verifyMsg.ok && (
                <p className="text-[13px] text-amber-600 dark:text-amber-400 mt-4 text-center">{verifyMsg.text}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
