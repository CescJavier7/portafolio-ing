'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Check, X, ArrowUpRight, ShieldCheck, Lock } from 'lucide-react';
import { sentraFreeScan, SentraApiError, type SentraFreeScan } from '@/lib/sentra/api';
import { gradeColor } from '@/lib/sentra/domainData';
import { useSentraSession } from '@/lib/sentra/useSession';

interface PublicScanDict {
  badge: string;
  title: string;
  subtitle: string;
  placeholder: string;
  scan: string;
  scanning: string;
  scoreLabel: string;
  passed: string;
  failed: string;
  ctaTitle: string;
  ctaBody: string;
  ctaRegister: string;
  ctaPanel: string;
  disclaimer: string;
  errorGeneric: string;
  errorRate: string;
}

const inputClass =
  'flex-1 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50';

export default function PublicScan({ lang, dict }: { lang: string; dict: PublicScanDict }) {
  const searchParams = useSearchParams();
  const { user } = useSentraSession();

  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SentraFreeScan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(async (target: string) => {
    const value = target.trim();
    if (!value) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await sentraFreeScan(value));
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 429) setError(dict.errorRate);
      else setError(err instanceof SentraApiError ? err.detail : dict.errorGeneric);
    } finally {
      setBusy(false);
    }
  }, [dict.errorGeneric, dict.errorRate]);

  // Auto-escaneo si llegamos con ?domain= (desde el hero de la landing).
  useEffect(() => {
    const q = searchParams.get('domain');
    if (q) {
      setDomain(q);
      runScan(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passedCount = result ? result.findings.filter((f) => f.passed).length : 0;

  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 selection:bg-green-500/30">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            {dict.badge}
          </span>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mb-3">{dict.title}</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto">{dict.subtitle}</p>
        </motion.div>

        {/* INPUT */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runScan(domain);
          }}
          className="flex flex-col sm:flex-row gap-3 mb-4"
        >
          <input
            type="text"
            required
            placeholder={dict.placeholder}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <Search className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
            {busy ? dict.scanning : dict.scan}
          </button>
        </form>

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>
        )}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center mb-10">{dict.disclaimer}</p>

        {/* RESULTADO */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Score */}
            <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 flex items-center gap-6">
              <div
                className="w-24 h-24 shrink-0 rounded-2xl flex flex-col items-center justify-center border-2"
                style={{ borderColor: gradeColor(result.grade), color: gradeColor(result.grade) }}
              >
                <span className="text-4xl font-black leading-none">{result.grade}</span>
                <span className="text-[11px] font-bold mt-1">{result.score}/100</span>
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">
                  {dict.scoreLabel}
                </p>
                <p className="text-lg font-black tracking-tight text-zinc-900 dark:text-white truncate">{result.domain}</p>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1">
                  {passedCount}/{result.findings.length} — {dict.passed}
                </p>
              </div>
            </div>

            {/* Findings */}
            <ul className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
              {result.findings.map((f) => (
                <li key={f.id} className="flex items-start gap-3 px-5 py-3.5">
                  {f.passed ? (
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-zinc-800 dark:text-zinc-200">{f.label}</p>
                    {!f.passed && f.recommendation && (
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">{f.recommendation}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* CTA de conversión */}
            <div className="rounded-3xl bg-zinc-900 dark:bg-black border border-zinc-800 p-8 text-center relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }}
              />
              <div className="relative z-10">
                <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-green-400 mb-3">
                  <Lock className="w-4 h-4" /> {dict.ctaTitle}
                </p>
                <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">{dict.ctaBody}</p>
                <Link
                  href={user ? `/${lang}/sentinel/panel` : `/${lang}/sentinel/register`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform"
                >
                  {user ? dict.ctaPanel : dict.ctaRegister} <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
