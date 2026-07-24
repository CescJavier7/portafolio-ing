'use client';

import { motion } from 'framer-motion';
import { ScrollText } from 'lucide-react';

export interface LegalDict {
  title: string;
  updatedLabel: string;
  updatedDate: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

export default function LegalPage({ dict }: { dict: LegalDict }) {
  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 selection:bg-green-500/30">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-green-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 dark:text-white">{dict.title}</h1>
          </div>
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-8">
            {dict.updatedLabel} {dict.updatedDate}
          </p>

          <p className="text-[15px] text-zinc-600 dark:text-zinc-300 leading-relaxed mb-10">{dict.intro}</p>

          <div className="space-y-9">
            {dict.sections.map((s, i) => (
              <div key={s.heading}>
                <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-3">
                  {i + 1}. {s.heading}
                </h2>
                <div className="space-y-3">
                  {s.body.map((p, j) => (
                    <p key={j} className="text-[14px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
