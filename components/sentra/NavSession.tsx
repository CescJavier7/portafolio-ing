'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { sentraLogout, type SentraUser } from '@/lib/sentra/api';

interface Dict {
  login: string;
  panel: string;
  logout: string;
}

// Widget de sesión del NavBar desktop, estilo SaaS: avatar con la inicial
// del correo + dropdown con opciones según la cuenta. El `user` llega por
// prop desde el NavBar (una sola instancia de useSentraSession para toda
// la barra — el menú móvil usa la misma).
export default function NavSession({
  lang,
  dict,
  user,
}: {
  lang: string;
  dict: Dict;
  user: SentraUser | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cierra el dropdown al hacer click fuera (patrón estándar de menús).
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await sentraLogout(); // dispara el evento: el hook pone user en null solo
    router.push(`/${lang}/sentinel/login`);
  }

  if (!user) {
    return (
      <Link
        href={`/${lang}/sentinel/login`}
        className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-apple-blue text-white text-[11px] font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
      >
        {dict.login}
      </Link>
    );
  }

  const initial = user.email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={user.email}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-black text-sm font-black flex items-center justify-center ring-2 ring-transparent hover:ring-green-500/40 transition-shadow"
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-full mt-3 w-64 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden py-2"
          >
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[13px] font-bold text-zinc-900 dark:text-white truncate">{user.email}</p>
              <p className="text-[11px] uppercase tracking-wider text-green-600 dark:text-green-400 font-semibold mt-0.5">
                {user.role}
              </p>
            </div>
            <Link
              href={`/${lang}/sentinel/panel`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> {dict.panel}
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-5 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" /> {dict.logout}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
