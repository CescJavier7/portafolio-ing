'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Code2, ShieldCheck, GraduationCap, ArrowUpRight, Check,
  Terminal, BookOpenCheck,
} from 'lucide-react';

interface ServiceCard {
  title: string;
  desc: string;
  items: string[];
  cta: string;
}

interface ServicesProps {
  lang: string;
  dict: {
    tag: string;
    title: string;
    subtitle: string;
    description: string;
    cards: {
      dev: ServiceCard;
      cyber: ServiceCard;
      teaching: ServiceCard;
    };
    ctaBand: {
      title: string;
      subtitle: string;
      buttonLabel: string;
    };
  };
}

export default function ServicesApple({ lang, dict }: ServicesProps) {
  if (!dict || !dict.cards) return null;

  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 selection:bg-green-500/30">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        {/* CABECERA */}
        <motion.div
          className="mb-16 md:mb-20 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-green-500 font-bold tracking-widest mb-3 uppercase text-xs">{dict.tag}</p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 text-zinc-900 dark:text-zinc-100 leading-tight">
            {dict.title} <br /> <span className="text-zinc-400 dark:text-zinc-500">{dict.subtitle}</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl font-medium">
            {dict.description}
          </p>
        </motion.div>

        {/* GRID DE SERVICIOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* 1. DESARROLLO DE SOFTWARE */}
          <motion.div
            whileHover={{ scale: 0.99 }}
            className="relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900/40 p-8 md:p-10 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col"
          >
            <div className="w-12 h-12 bg-zinc-100 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6">
              <Code2 className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
              {dict.cards.dev.title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed mb-6">
              {dict.cards.dev.desc}
            </p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {dict.cards.dev.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                  <Check className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={`/${lang}/#contacto`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:gap-2.5 transition-all"
            >
              {dict.cards.dev.cta} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* 2. CIBERSEGURIDAD -> apunta a /sentinel */}
          <motion.div
            whileHover={{ scale: 0.99 }}
            className="relative overflow-hidden rounded-3xl bg-zinc-900 dark:bg-zinc-950 p-8 md:p-10 border border-zinc-800 shadow-xl flex flex-col group"
          >
            <div
              className="absolute inset-0 opacity-[0.04] group-hover:opacity-10 transition-opacity duration-700"
              style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }}
            />
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(74,222,128,0.1)]">
                <ShieldCheck className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                {dict.cards.cyber.title}
              </h3>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6">
                {dict.cards.cyber.desc}
              </p>
              <ul className="space-y-2.5 mb-8 flex-1">
                {dict.cards.cyber.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${lang}/sentinel/scan`}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-green-400 hover:gap-2.5 transition-all"
              >
                {dict.cards.cyber.cta} <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* 3. DOCENCIA INFORMÁTICA */}
          <motion.div
            whileHover={{ scale: 0.99 }}
            className="relative overflow-hidden rounded-3xl bg-blue-600 dark:bg-blue-900/40 p-8 md:p-10 text-white border border-blue-500/30 shadow-xl flex flex-col"
          >
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center mb-6">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3">{dict.cards.teaching.title}</h3>
            <p className="text-blue-100 dark:text-blue-200 text-sm md:text-base leading-relaxed mb-6">
              {dict.cards.teaching.desc}
            </p>
            <ul className="space-y-2.5 mb-8 flex-1">
              {dict.cards.teaching.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-blue-50">
                  <Check className="w-4 h-4 text-white mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={`/${lang}/#contacto`}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-white hover:gap-2.5 transition-all"
            >
              {dict.cards.teaching.cta} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>

        {/* BANDA CTA FINAL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 md:mt-10 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-black border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h4 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white">{dict.ctaBand.title}</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.ctaBand.subtitle}</p>
            </div>
          </div>
          <Link
            href={`/${lang}/#contacto`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold hover:scale-105 transition-transform shrink-0"
          >
            <BookOpenCheck className="w-4 h-4" />
            {dict.ctaBand.buttonLabel}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}