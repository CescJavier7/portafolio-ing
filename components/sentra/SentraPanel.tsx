'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldCheck, LogOut, Construction } from 'lucide-react';
import {
  sentraHasToken,
  sentraLogout,
  sentraMe,
  sentraRefresh,
  type SentraUser,
} from '@/lib/sentra/api';

interface Dict {
  title: string;
  wip: string;
  sessionAs: string;
  logout: string;
  loading: string;
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

          <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
              <Construction className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
              {dict.wip}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
