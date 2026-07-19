'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, LogOut, KeyRound, Gem } from 'lucide-react';
import {
  sentraChangePassword,
  sentraCreateCheckout,
  sentraGetBillingPortal,
  sentraGetSubscription,
  sentraHasToken,
  sentraLogout,
  sentraMe,
  sentraRefresh,
  SentraApiError,
  type SentraUser,
} from '@/lib/sentra/api';
import TargetsCard, { type TargetsDict } from '@/components/sentra/TargetsCard';
import { type UpgradeDict } from '@/components/sentra/UpgradeModal';

interface Dict {
  title: string;
  wip: string;
  sessionAs: string;
  logout: string;
  loading: string;
  securityTitle: string;
  securityDesc: string;
  currentPassword: string;
  newPassword: string;
  newPasswordHint: string;
  changeSubmit: string;
  changing: string;
  changed: string;
  planTitle: string;
  planFree: string;
  planDesc: string;
  planProDesc: string;
  upgrade: string;
  upgrading: string;
  upgradeError: string;
  testModeNote: string;
  manageBtn: string;
  managing: string;
  manageError: string;
  targets: TargetsDict;
  upgrade_modal: UpgradeDict;
}

const inputClass =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition';

function PlanCard({ dict }: { dict: Dict }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sentraGetSubscription()
      .then((sub) => setPlan(sub.plan))
      .catch(() => setPlan('FREE')); // sin drama: el plan por defecto es FREE
  }, []);

  async function handleUpgrade() {
    setBusy(true);
    setError(null);
    try {
      const url = await sentraCreateCheckout();
      // Checkout hosteado: navegamos, no abrimos popup (los bloqueadores
      // de popups matarían la venta).
      window.location.href = url;
    } catch {
      setError(dict.upgradeError);
      setBusy(false);
    }
  }

  async function handlePortal() {
    setBusy(true);
    setError(null);
    try {
      window.location.href = await sentraGetBillingPortal();
    } catch {
      setError(dict.manageError);
      setBusy(false);
    }
  }

  const isPro = plan === 'PRO';

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 mt-6">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Gem className="w-5 h-5 text-green-500" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
            {dict.planTitle}
          </h2>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${
            isPro
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          {plan === null ? '…' : isPro ? 'Pro' : dict.planFree}
        </span>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        {isPro ? dict.planProDesc : dict.planDesc}
      </p>

      {!isPro && (
        <>
          <button
            onClick={handleUpgrade}
            disabled={busy || plan === null}
            className="px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
          >
            {busy ? dict.upgrading : dict.upgrade}
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          <p className="mt-4 text-[11px] text-zinc-400 dark:text-zinc-500">{dict.testModeNote}</p>
        </>
      )}

      {isPro && (
        <>
          <button
            onClick={handlePortal}
            disabled={busy}
            className="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
          >
            {busy ? dict.managing : dict.manageBtn}
          </button>
          {error && (
            <p className="mt-4 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ChangePasswordCard({ dict }: { dict: Dict }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      await sentraChangePassword({ current_password: current, new_password: next });
      setOk(true);
      setCurrent('');
      setNext('');
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 mt-6">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-green-500" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
          {dict.securityTitle}
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{dict.securityDesc}</p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            {dict.currentPassword}
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            {dict.newPassword}
          </label>
          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{dict.newPasswordHint}</p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        {ok && (
          <p className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            {dict.changed}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          {busy ? dict.changing : dict.changeSubmit}
        </button>
      </form>
    </div>
  );
}

export default function SentraPanel({ lang, dict }: { lang: string; dict: Dict }) {
  const router = useRouter();
  const [user, setUser] = useState<SentraUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Sin token en sessionStorage (pestaña nueva, o expiró): intentamos
      // renovar con la cookie httpOnly de refresh antes de rendirnos.
      if (!sentraHasToken()) {
        const alive = await sentraRefresh();
        if (!alive) {
          router.replace(`/${lang}/sentinel/login`);
          return;
        }
      }
      try {
        const me = await sentraMe();
        if (!cancelled) {
          setUser(me);
          setChecking(false);
        }
      } catch {
        // Token presente pero rechazado (expiró hace rato): un último
        // intento de refresh y si no, al login.
        const alive = await sentraRefresh();
        if (!alive) {
          router.replace(`/${lang}/sentinel/login`);
          return;
        }
        const me = await sentraMe();
        if (!cancelled) {
          setUser(me);
          setChecking(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [lang, router]);

  async function handleLogout() {
    await sentraLogout();
    router.replace(`/${lang}/sentinel/login`);
  }

  if (checking) {
    return (
      <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] flex items-start justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 animate-pulse mt-20">{dict.loading}</p>
      </section>
    );
  }

  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                  {dict.title}
                </h1>
                {user && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {dict.sessionAs} <span className="font-bold">{user.email}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> {dict.logout}
            </button>
          </div>

          <TargetsCard dict={dict.targets} upgradeDict={dict.upgrade_modal} lang={lang} />

          <PlanCard dict={dict} />

          <ChangePasswordCard dict={dict} />
        </motion.div>
      </div>
    </section>
  );
}
