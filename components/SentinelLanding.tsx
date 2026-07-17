'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, Radar, FileSearch, Sparkles, ArrowUpRight, Clock } from 'lucide-react';

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
  };
}

const featureIcons = [ShieldCheck, Radar, FileSearch, Sparkles];

export default function SentinelLanding({ lang, dict }: SentinelProps) {
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
            <Clock className="w-3.5 h-3.5" />
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
            <p className="text-sm font-bold uppercase tracking-widest text-green-400 mb-3">{dict.statusLabel}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/${lang}/#contacto`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform"
              >
                {dict.ctaWaitlist} <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${lang}/services`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-white/5 transition-colors"
              >
                {dict.ctaBack}
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}