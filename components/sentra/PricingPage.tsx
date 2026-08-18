'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, ArrowUpRight, Sparkles } from 'lucide-react';
import { useSentraSession } from '@/lib/sentra/useSession';
import UpgradeModal, { type UpgradeDict } from '@/components/sentra/UpgradeModal';

interface Plan {
  id: string; // 'free' | 'pro' | 'team' (viene del JSON de i18n)
  name: string;
  price: string;
  priceNote: string;
  desc: string;
  cta: string;
  features: string[];
}

interface PricingDict {
  badge: string;
  title: string;
  subtitle: string;
  mostPopular: string;
  plans: Plan[];
  footnote: string;
  faqTitle: string;
  faq: { q: string; a: string }[];
}

// Correo de contacto para el plan Empresa/Team ("Hablemos").
const CONTACT_EMAIL = 'javiercaiza220158@gmail.com';

export default function PricingPage({
  lang,
  dict,
  upgradeDict,
}: {
  lang: string;
  dict: PricingDict;
  upgradeDict: UpgradeDict;
}) {
  const { user } = useSentraSession();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // El plan Empresa siempre va a contacto. Sin sesión, al registro (necesitas
  // cuenta antes de pagar). El botón Pro con sesión abre el pago manual aquí
  // mismo (ver `openManual` abajo) — ya no vamos a Lemon Squeezy.
  function ctaHref(id: string): string {
    if (id === 'team') return `mailto:${CONTACT_EMAIL}?subject=Sentra%20Empresa`;
    if (user) return `/${lang}/sentinel/panel`;
    return `/${lang}/sentinel/register`;
  }

  // ¿Este CTA debe abrir el modal de pago manual en vez de navegar?
  // Solo el plan Pro y solo si ya hay sesión (si no, primero se registran).
  const opensManual = (id: string) => id === 'pro' && !!user;

  const ctaClass = (featured: boolean) =>
    `block w-full text-center px-5 py-3 rounded-full text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98] mb-7 ${
      featured
        ? 'bg-green-500 text-black'
        : 'border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5'
    }`;

  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 selection:bg-green-500/30">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 mb-6">
            {dict.badge}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white mb-4">
            {dict.title}
          </h1>
          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">{dict.subtitle}</p>
        </motion.div>

        {/* PLANES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-start mb-16">
          {dict.plans.map((plan, i) => {
            const featured = plan.id === 'pro';
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className={`relative rounded-3xl p-7 md:p-8 border ${
                  featured
                    ? 'bg-zinc-900 dark:bg-black border-green-500/50 md:-mt-4 md:mb-4 md:scale-[1.03] shadow-[0_0_55px_-12px_rgba(34,197,94,0.55)]'
                    : 'bg-white dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 shadow-sm'
                }`}
              >
                {featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-500 text-black">
                    <Sparkles className="w-3 h-3" /> {dict.mostPopular}
                  </span>
                )}

                <h3 className={`text-lg font-black tracking-tight mb-1 ${featured ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-[13px] mb-5 ${featured ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {plan.desc}
                </p>

                <div className="flex items-end gap-1.5 mb-6">
                  <span className={`text-4xl font-black tracking-tighter ${featured ? 'text-white' : 'text-zinc-900 dark:text-white'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-[13px] font-semibold mb-1.5 ${featured ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {plan.priceNote}
                  </span>
                </div>

                {opensManual(plan.id) ? (
                  <button onClick={() => setUpgradeOpen(true)} className={ctaClass(featured)}>
                    {plan.cta}
                  </button>
                ) : (
                  <Link href={ctaHref(plan.id)} className={ctaClass(featured)}>
                    {plan.cta}
                  </Link>
                )}

                {plan.id === 'pro' && (
                  <p className={`text-[11px] text-center -mt-5 mb-6 ${featured ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {lang === 'en' ? 'Monthly · cancel anytime, no lock-in' : 'Renovación mensual · cancela cuando quieras'}
                  </p>
                )}

                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${featured ? 'text-green-400' : 'text-green-500'}`} />
                      <span className={`text-[13px] leading-snug ${featured ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-300'}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[12px] text-zinc-400 dark:text-zinc-500 mb-20 max-w-xl mx-auto">{dict.footnote}</p>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white text-center mb-8">{dict.faqTitle}</h2>
          <div className="space-y-3">
            {dict.faq.map((item) => (
              <div key={item.q} className="rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-5">
                <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">{item.q}</p>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="text-center mt-16">
          {user ? (
            <button
              onClick={() => setUpgradeOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform"
            >
              {dict.plans[1].cta} <ArrowUpRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href={`/${lang}/sentinel/register`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform"
            >
              {dict.plans[0].cta} <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        dict={upgradeDict}
        lang={lang as 'es' | 'en'}
      />
    </section>
  );
}
