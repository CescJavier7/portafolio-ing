'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MailCheck, ShieldCheck } from 'lucide-react';
import { sentraRegister, SentraApiError } from '@/lib/sentra/api';

interface Dict {
  title: string;
  subtitle: string;
  emailLabel: string;
  passwordLabel: string;
  passwordHint: string;
  orgLabel: string;
  orgPlaceholder: string;
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  haveAccount: string;
  loginLink: string;
  marketingConsent: string;
}

const inputClass =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition';

export default function SentraRegister({ lang, dict }: { lang: string; dict: Dict }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [org, setOrg] = useState('');
  // Opt-in de marketing: SIEMPRE desmarcado por defecto (requisito legal
  // de consentimiento explícito — GDPR/LOPD).
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await sentraRegister({
        email,
        password,
        organization_name: org,
        marketing_consent: consent,
      });
      // La API responde SIEMPRE el mensaje genérico (anti-enumeración):
      // el estado de éxito aquí solo significa "petición aceptada".
      setDone(true);
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8"
        >
          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
                <MailCheck className="w-7 h-7 text-green-500" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mb-3">
                {dict.successTitle}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {dict.successBody}
              </p>
              <Link
                href={`/${lang}/sentinel/login`}
                className="inline-block mt-6 text-sm font-bold text-green-600 dark:text-green-400 hover:underline"
              >
                {dict.loginLink} →
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                  {dict.title}
                </h1>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">{dict.subtitle}</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    {dict.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    {dict.passwordLabel}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{dict.passwordHint}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    {dict.orgLabel}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    placeholder={dict.orgPlaceholder}
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-green-500"
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {dict.marketingConsent}
                  </span>
                </label>

                {error && (
                  <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
                >
                  {loading ? dict.submitting : dict.submit}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {dict.haveAccount}{' '}
                <Link
                  href={`/${lang}/sentinel/login`}
                  className="font-bold text-green-600 dark:text-green-400 hover:underline"
                >
                  {dict.loginLink}
                </Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
