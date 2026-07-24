'use client';

import { motion } from 'framer-motion';
import {
  ShieldCheck, KeyRound, Timer, Lock, Server, EyeOff, FileWarning, Fingerprint, Mail,
} from 'lucide-react';

interface SecurityDict {
  badge: string;
  title: string;
  subtitle: string;
  intro: string;
  practices: { title: string; desc: string }[];
  disclosureTitle: string;
  disclosureBody: string;
  disclosureCta: string;
  updatedLabel: string;
  updatedDate: string;
}

// Orden fijo: los iconos acompañan a las prácticas en el mismo orden del dict.
const ICONS = [KeyRound, Timer, ShieldCheck, Lock, Server, EyeOff, Fingerprint, FileWarning];

const DISCLOSURE_EMAIL = 'javiercaiza220158@gmail.com';

export default function SecurityPage({ dict }: { dict: SecurityDict }) {
  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 selection:bg-green-500/30">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            {dict.badge}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white mb-4">{dict.title}</h1>
          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">{dict.subtitle}</p>
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{dict.intro}</p>
        </motion.div>

        {/* PRÁCTICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          {dict.practices.map((p, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 2) * 0.08 }}
                className="rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 flex gap-4"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white mb-1.5">{p.title}</h3>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{p.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* DIVULGACIÓN RESPONSABLE */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-zinc-900 dark:bg-black border border-zinc-800 p-8 md:p-10 text-center"
        >
          <p className="text-sm font-bold uppercase tracking-widest text-green-400 mb-3">{dict.disclosureTitle}</p>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto mb-6 leading-relaxed">{dict.disclosureBody}</p>
          <a
            href={`mailto:${DISCLOSURE_EMAIL}?subject=Sentra%20Security%20Disclosure`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform"
          >
            <Mail className="w-4 h-4" /> {dict.disclosureCta}
          </a>
        </motion.div>

        <p className="text-center text-[12px] text-zinc-400 dark:text-zinc-500 mt-8">
          {dict.updatedLabel} {dict.updatedDate}
        </p>
      </div>
    </section>
  );
}
