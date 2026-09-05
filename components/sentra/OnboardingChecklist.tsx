'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight, X, Rocket, Circle } from 'lucide-react';
import { sentraListTargets, sentraListScans } from '@/lib/sentra/api';

const DISMISS_KEY = 'sentra_onboarding_dismissed_v1';

// Onboarding de activación: guía al usuario nuevo por los 3 hitos que convierten
// una cuenta en un usuario activo (dominio → verificado por DNS → primer escaneo).
// El estado se DERIVA de datos reales (sin tabla nueva). Se auto-oculta cuando los
// tres hitos están completos o si el usuario lo descarta.
export default function OnboardingChecklist({
  lang,
  onNavigate,
}: {
  lang: string;
  onNavigate: (section: 'tool') => void;
}) {
  const en = lang === 'en';
  const [state, setState] = useState<{ hasDomain: boolean; hasVerified: boolean; hasScanned: boolean } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {
      /* private mode */
    }
    let alive = true;
    (async () => {
      try {
        const targets = await sentraListTargets();
        const verified = targets.find((t) => t.verified);
        let hasScanned = false;
        if (verified) {
          try {
            hasScanned = (await sentraListScans(verified.id)).length > 0;
          } catch {
            /* best-effort */
          }
        }
        if (alive) setState({ hasDomain: targets.length > 0, hasVerified: !!verified, hasScanned });
      } catch {
        if (alive) setState({ hasDomain: false, hasVerified: false, hasScanned: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* private mode */
    }
  }

  if (dismissed || !state) return null;

  const steps = [
    {
      done: true,
      title: en ? 'Create your account' : 'Crea tu cuenta',
      desc: en ? 'Done — welcome aboard.' : 'Hecho — bienvenido a bordo.',
      cta: null as null | { label: string; onClick: () => void },
    },
    {
      done: state.hasDomain,
      title: en ? 'Add your domain' : 'Agrega tu dominio',
      desc: en ? 'Register the website you want to protect.' : 'Registra el sitio web que quieres proteger.',
      cta: { label: en ? 'Add domain' : 'Agregar dominio', onClick: () => onNavigate('tool') },
    },
    {
      done: state.hasVerified,
      title: en ? 'Verify it by DNS' : 'Verifícalo por DNS',
      desc: en ? 'A TXT record proves you own it (ethical-legal barrier to scan).' : 'Un registro TXT prueba que es tuyo (barrera ético-legal para escanear).',
      cta: { label: en ? 'Verify domain' : 'Verificar dominio', onClick: () => onNavigate('tool') },
    },
    {
      done: state.hasScanned,
      title: en ? 'Run your first scan' : 'Ejecuta tu primer escaneo',
      desc: en ? 'Get your Security Score and prioritized findings.' : 'Obtén tu Security Score y hallazgos priorizados.',
      cta: { label: en ? 'Scan now' : 'Escanear ahora', onClick: () => onNavigate('tool') },
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null; // ya activado → no molestar
  const pct = Math.round((doneCount / steps.length) * 100);
  // Índice del primer paso pendiente (es el "activo", con CTA resaltado).
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="rounded-3xl border border-green-500/25 bg-gradient-to-b from-green-500/[0.06] to-transparent p-6 md:p-7">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-green-500" />
          </span>
          <div>
            <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">
              {en ? 'Get started with Sentra' : 'Empieza con Sentra'}
            </h3>
            <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">
              {en ? `${doneCount} of ${steps.length} steps · ${pct}%` : `${doneCount} de ${steps.length} pasos · ${pct}%`}
            </p>
          </div>
        </div>
        <button onClick={dismiss} title={en ? 'Dismiss' : 'Ocultar'} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-5">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>

      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                isActive ? 'border-green-500/40 bg-white dark:bg-zinc-900/50' : 'border-transparent'
              }`}
            >
              <span
                className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${
                  s.done ? 'bg-green-500 text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}
              >
                {s.done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[14px] font-bold ${s.done ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}>{s.title}</p>
                {!s.done && <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400">{s.desc}</p>}
              </div>
              {isActive && s.cta && (
                <button
                  onClick={s.cta.onClick}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-green-500 text-black text-[13px] font-bold hover:brightness-105 active:scale-[0.98] transition shrink-0"
                >
                  {s.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-4">
        {en ? 'Your plan also includes ' : 'Tu plan también incluye '}
        <Link href={`/${lang}/herramientas/cv`} className="font-semibold text-green-600 dark:text-green-400 hover:underline">
          Sentra CV AI
        </Link>
        {en ? ' and the ' : ' y la '}
        <Link href={`/${lang}/academia`} className="font-semibold text-green-600 dark:text-green-400 hover:underline">
          {en ? 'Academy' : 'Academia'}
        </Link>
        .
      </p>
    </div>
  );
}
