'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LogIn, MailWarning } from 'lucide-react';
import { sentraLogin, sentraResendVerification, SentraApiError } from '@/lib/sentra/api';
import { useSentraSession } from '@/lib/sentra/useSession';

interface Dict {
  title: string;
  subtitle: string;
  emailLabel: string;
  passwordLabel: string;
  submit: string;
  submitting: string;
  noAccount: string;
  registerLink: string;
  unverifiedTitle: string;
  resend: string;
  resent: string;
  genericError: string;
}

const inputClass =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition';

export default function SentraLogin({ lang, dict }: { lang: string; dict: Dict }) {
  const router = useRouter();
  const { user: sessionUser } = useSentraSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 403 = cuenta sin verificar: caso especial con CTA de reenvío,
  // distinto del 401 genérico de credenciales inválidas.
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  // Con sesión activa, el login no tiene sentido: directo al panel.
  useEffect(() => {
    if (sessionUser) router.replace(`/${lang}/sentinel/panel`);
  }, [sessionUser, lang, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverified(false);
    try {
      await sentraLogin({ email, password });
      router.push(`/${lang}/sentinel/panel`);
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 403) {
        setUnverified(true);
      } else if (err instanceof SentraApiError && (err.status === 401 || err.status === 423)) {
        setError(err.detail);
      } else {
        setError(dict.genericError);
      }
      setLoading(false);
    }
  }

  async function handleResend() {
    setResent(false);
    try {
      await sentraResendVerification(email);
    } finally {
      // La API siempre responde genérico: mostramos confirmación igual.
      setResent(true);
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-green-500" />
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>

            {unverified && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-2">
                  <MailWarning className="w-4 h-4" /> {dict.unverifiedTitle}
                </p>
                {resent ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.resent}</p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {dict.resend}
                  </button>
                )}
              </div>
            )}

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
            {dict.noAccount}{' '}
            <Link
              href={`/${lang}/sentinel/register`}
              className="font-bold text-green-600 dark:text-green-400 hover:underline"
            >
              {dict.registerLink}
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
