'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, History, FileSearch, BellRing, ArrowUpRight, PartyPopper, Search } from 'lucide-react';
import { useSentraSession } from '@/lib/sentra/useSession';

interface Feature {
  title: string;
  desc: string;
}

interface SentinelProps {
  lang: string;
  dict: {
    badge: string;
    name: string;
    tagline: string;
    title: string;
    subtitle: string;
    description: string;
    statusLabel: string;
    features: Feature[];
    ctaWaitlist: string;
    ctaBack: string;
    ctaRegister?: string;
    ctaLogin?: string;
    ctaLoggedTitle?: string;
    ctaLoggedBody?: string;
    ctaPanel?: string;
    heroScanPlaceholder?: string;
    heroScanCta?: string;
  };
}

// Orden alineado a la narrativa: Monitoreo continuo · Historial (qué cambió) ·
// Security Score · Informes con IA.
const featureIcons = [BellRing, History, ShieldCheck, FileSearch];

export default function SentinelLanding({ lang, dict }: SentinelProps) {
  // Sesión de Sentra: si el visitante ya tiene cuenta, el CTA de registro
  // no tiene sentido — se convierte en un "ya estás dentro" + link al panel.
  const { user } = useSentraSession();
  const router = useRouter();
  const [heroDomain, setHeroDomain] = useState('');

  if (!dict) return null;

  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 selection:bg-green-500/30">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16 md:mb-20"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            {dict.badge}
          </span>

          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-zinc-900 dark:text-white mb-4">
            {dict.name}
            <span className="text-green-500">.</span>
          </h1>
          <p className="text-lg md:text-xl font-semibold text-zinc-500 dark:text-zinc-400 mb-6">
            {dict.tagline}
          </p>
          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {dict.description}
          </p>

          {/* Gancho: escanea tu dominio gratis, sin registro. Navega a la
              página pública de escaneo con el dominio precargado. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = heroDomain.trim();
              if (v) router.push(`/${lang}/sentinel/scan?domain=${encodeURIComponent(v)}`);
            }}
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto"
          >
            <input
              type="text"
              value={heroDomain}
              onChange={(e) => setHeroDomain(e.target.value)}
              placeholder={dict.heroScanPlaceholder ?? 'tudominio.com'}
              className="flex-1 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
            <button
              type="submit"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Search className="w-4 h-4" /> {dict.heroScanCta ?? 'Escanear gratis'}
            </button>
          </form>
        </motion.div>

        {/* FEATURES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6 mb-16">
          {dict.features.map((feature, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-7 flex gap-4"
              >
                <div className="w-11 h-11 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-zinc-900 dark:bg-black border border-zinc-800 p-8 md:p-12 text-center relative overflow-hidden"
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }}
          />
          <div className="relative z-10">
            {user ? (
              <>
                <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-green-400 mb-3">
                  <PartyPopper className="w-4 h-4" />
                  {dict.ctaLoggedTitle ?? dict.statusLabel}
                </p>
                <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">{dict.ctaLoggedBody}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href={`/${lang}/sentinel/panel`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform"
                  >
                    {dict.ctaPanel ?? 'Panel'} <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/${lang}/sentinel/precios`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-white/5 transition-colors"
                  >
                    {dict.ctaBack ?? 'Precios'}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold uppercase tracking-widest text-green-400 mb-3">{dict.statusLabel}</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href={`/${lang}/sentinel/register`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform"
                  >
                    {dict.ctaRegister ?? dict.ctaWaitlist} <ArrowUpRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/${lang}/sentinel/login`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-white/5 transition-colors"
                  >
                    {dict.ctaLogin ?? dict.ctaBack}
                  </Link>
                </div>
                <div className="mt-5">
                  <Link
                    href={`/${lang}/sentinel/precios`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-400 hover:text-green-400 transition-colors"
                  >
                    {dict.ctaBack ?? 'Ver planes y precios'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}