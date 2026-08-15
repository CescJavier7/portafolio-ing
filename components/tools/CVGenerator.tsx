'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText, Sparkles, Upload, Trash2, Download, ArrowUpRight, Lock,
  Target, ListChecks, Lightbulb, Plus, ImageIcon,
} from 'lucide-react';
import {
  sentraGenerateCV, sentraOcrJobPosting, sentraListCVs, sentraGetCV, sentraDeleteCV,
  SentraApiError,
  type SentraCVDocument, type SentraCVListItem,
} from '@/lib/sentra/api';
import { openCVPdf } from '@/lib/sentra/cvPdf';
import { useSentraSession } from '@/lib/sentra/useSession';

export interface CVDict {
  badge: string;
  title: string;
  subtitle: string;
  benefits: { title: string; desc: string }[];
  howTitle: string;
  howSteps: string[];
  gateTitle: string;
  gateBody: string;
  register: string;
  login: string;
  profileLabel: string;
  profileHint: string;
  profilePlaceholder: string;
  jobLabel: string;
  jobHint: string;
  jobPlaceholder: string;
  uploadImage: string;
  ocrBusy: string;
  generate: string;
  generating: string;
  matchLabel: string;
  summaryTitle: string;
  experienceTitle: string;
  educationTitle: string;
  skillsTitle: string;
  languagesTitle: string;
  missingTitle: string;
  tipsTitle: string;
  downloadPdf: string;
  newCv: string;
  historyTitle: string;
  historyEmpty: string;
  open: string;
  delete: string;
  errorGeneric: string;
  limitReached: string;
  upgrade: string;
  pdf: {
    summary: string;
    experience: string;
    education: string;
    skills: string;
    languages: string;
    generatedBy: string;
  };
}

function matchColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 50) return '#ca8a04';
  return '#dc2626';
}

const inputBase =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50';

export default function CVGenerator({ lang, dict }: { lang: string; dict: CVDict }) {
  const { user, checking } = useSentraSession();

  const [profileText, setProfileText] = useState('');
  const [jobPosting, setJobPosting] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<SentraCVDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SentraCVListItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) sentraListCVs().then(setHistory).catch(() => {});
  }, [user]);

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrBusy(true);
    setError(null);
    try {
      const { text } = await sentraOcrJobPosting(file);
      // Se rellena el textarea; el usuario REVISA/corrige antes de generar.
      setJobPosting((prev) => (prev ? `${prev}\n${text}` : text));
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : dict.errorGeneric);
    } finally {
      setOcrBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const cv = await sentraGenerateCV({ profile_text: profileText, job_posting: jobPosting });
      setResult(cv);
      setHistory((prev) => [
        { id: cv.id, title: cv.title, match_score: cv.match_score, created_at: cv.created_at, updated_at: cv.updated_at },
        ...prev,
      ]);
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) setError(dict.limitReached);
      else setError(err instanceof SentraApiError ? err.detail : dict.errorGeneric);
    } finally {
      setGenerating(false);
    }
  }

  async function loadCV(id: string) {
    try {
      const cv = await sentraGetCV(id);
      setResult(cv);
      setJobPosting(cv.job_posting);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      /* noop */
    }
  }

  async function removeCV(id: string) {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (result?.id === id) setResult(null);
    try {
      await sentraDeleteCV(id);
    } catch {
      sentraListCVs().then(setHistory).catch(() => {});
    }
  }

  return (
    <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 selection:bg-green-500/30">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        {/* HERO — siempre visible (SEO) */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/20 mb-6">
            <Sparkles className="w-3.5 h-3.5" /> {dict.badge}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-white mb-4">{dict.title}</h1>
          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">{dict.subtitle}</p>
        </motion.div>

        {/* Beneficios (SEO) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {dict.benefits.map((b, i) => {
            const Icon = [Target, Sparkles, ListChecks][i % 3];
            return (
              <div key={b.title} className="rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-green-500" />
                </div>
                <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white mb-1.5">{b.title}</h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed">{b.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Estado de sesión */}
        {checking ? (
          <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-8">…</p>
        ) : !user ? (
          <GateCard lang={lang} dict={dict} />
        ) : (
          <>
            {/* HERRAMIENTA */}
            {!result && (
              <form onSubmit={handleGenerate} className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8 space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{dict.profileLabel}</label>
                  <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-2">{dict.profileHint}</p>
                  <textarea
                    required
                    minLength={30}
                    rows={7}
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    placeholder={dict.profilePlaceholder}
                    className={`${inputBase} resize-y`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dict.jobLabel}</label>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={ocrBusy}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-600 dark:text-green-400 hover:underline disabled:opacity-60"
                    >
                      {ocrBusy ? <ImageIcon className="w-3.5 h-3.5 animate-pulse" /> : <Upload className="w-3.5 h-3.5" />}
                      {ocrBusy ? dict.ocrBusy : dict.uploadImage}
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                  </div>
                  <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-2">{dict.jobHint}</p>
                  <textarea
                    required
                    minLength={30}
                    rows={7}
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    placeholder={dict.jobPlaceholder}
                    className={`${inputBase} resize-y`}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    {error}
                    {error === dict.limitReached && (
                      <Link href={`/${lang}/sentinel/precios`} className="ml-2 font-bold underline">{dict.upgrade}</Link>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generating}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60"
                >
                  <Sparkles className={`w-4 h-4 ${generating ? 'animate-pulse' : ''}`} />
                  {generating ? dict.generating : dict.generate}
                </button>
              </form>
            )}

            {/* RESULTADO */}
            {result && (
              <CVResult
                cv={result}
                dict={dict}
                onNew={() => { setResult(null); setError(null); }}
                onPdf={() => openCVPdf(result.content, dict.pdf)}
              />
            )}

            {/* HISTORIAL */}
            <div className="mt-10">
              <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-4">{dict.historyTitle}</h2>
              {history.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">{dict.historyEmpty}</p>
              ) : (
                <ul className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center gap-4 px-5 py-3.5">
                      <span
                        className="shrink-0 w-11 h-11 rounded-xl border-2 flex items-center justify-center text-[13px] font-black"
                        style={{ borderColor: matchColor(h.match_score), color: matchColor(h.match_score) }}
                      >
                        {h.match_score}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{h.title}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">{new Date(h.created_at).toLocaleString()}</p>
                      </div>
                      <button onClick={() => loadCV(h.id)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5">
                        {dict.open}
                      </button>
                      <button onClick={() => removeCV(h.id)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 hover:border-red-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" /> {dict.delete}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {/* Cómo funciona (SEO) */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white text-center mb-6">{dict.howTitle}</h2>
          <ol className="space-y-3">
            {dict.howSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-4">
                <span className="shrink-0 w-6 h-6 rounded-full bg-green-500 text-black text-[12px] font-black flex items-center justify-center">{i + 1}</span>
                <span className="text-[14px] text-zinc-600 dark:text-zinc-300 leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function GateCard({ lang, dict }: { lang: string; dict: CVDict }) {
  return (
    <div className="rounded-3xl bg-zinc-900 dark:bg-black border border-zinc-800 p-8 md:p-12 text-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      <div className="relative z-10">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5">
          <Lock className="w-6 h-6 text-green-400" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white mb-3">{dict.gateTitle}</h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto mb-7 leading-relaxed">{dict.gateBody}</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={`/${lang}/sentinel/register`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-105 transition-transform">
            {dict.register} <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link href={`/${lang}/sentinel/login`} className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-zinc-700 text-zinc-300 text-sm font-bold hover:bg-white/5 transition-colors">
            {dict.login}
          </Link>
        </div>
      </div>
    </div>
  );
}

function CVResult({ cv, dict, onNew, onPdf }: { cv: SentraCVDocument; dict: CVDict; onNew: () => void; onPdf: () => void }) {
  const c = cv.content;
  const chips = (items: string[]) =>
    items.map((s) => (
      <span key={s} className="inline-block px-3 py-1 rounded-full text-[12px] font-semibold bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 mr-2 mb-2">{s}</span>
    ));

  return (
    <div className="space-y-6">
      {/* Cabecera con match score + acciones */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div
          className="shrink-0 w-24 h-24 rounded-2xl border-4 flex flex-col items-center justify-center"
          style={{ borderColor: matchColor(cv.match_score), color: matchColor(cv.match_score) }}
        >
          <span className="text-3xl font-black leading-none">{cv.match_score}%</span>
          <span className="text-[10px] font-bold uppercase mt-1">{dict.matchLabel}</span>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">{c.full_name || cv.title}</h2>
          <p className="text-[14px] text-green-600 dark:text-green-400 font-semibold">{c.headline}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={onPdf} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-500 text-black text-[13px] font-bold hover:scale-[1.02] transition-transform">
            <Download className="w-4 h-4" /> {dict.downloadPdf}
          </button>
          <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5">
            <Plus className="w-4 h-4" /> {dict.newCv}
          </button>
        </div>
      </div>

      {/* Contenido del CV */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8 space-y-6">
        {c.summary && <Section icon={<FileText className="w-4 h-4" />} title={dict.summaryTitle}><p className="text-[14px] text-zinc-600 dark:text-zinc-300 leading-relaxed">{c.summary}</p></Section>}
        {c.experience.length > 0 && (
          <Section icon={<Target className="w-4 h-4" />} title={dict.experienceTitle}>
            <div className="space-y-4">
              {c.experience.map((e, i) => (
                <div key={i}>
                  <p className="text-[14px] font-bold text-zinc-900 dark:text-white">
                    {e.role}{e.company ? ` · ${e.company}` : ''}
                    {e.period && <span className="ml-2 text-[12px] font-medium text-zinc-400">{e.period}</span>}
                  </p>
                  {e.highlights?.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {e.highlights.map((h, j) => (
                        <li key={j} className="flex items-start gap-2 text-[13px] text-zinc-600 dark:text-zinc-400">
                          <span className="w-1 h-1 rounded-full bg-green-500 mt-2 shrink-0" />{h}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
        {c.education.length > 0 && (
          <Section icon={<FileText className="w-4 h-4" />} title={dict.educationTitle}>
            <ul className="space-y-1">{c.education.map((s, i) => <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-400">{s}</li>)}</ul>
          </Section>
        )}
        {c.skills.length > 0 && <Section icon={<Sparkles className="w-4 h-4" />} title={dict.skillsTitle}><div>{chips(c.skills)}</div></Section>}
        {c.languages.length > 0 && <Section icon={<Sparkles className="w-4 h-4" />} title={dict.languagesTitle}><div>{chips(c.languages)}</div></Section>}
      </div>

      {/* Análisis del match (el diferenciador) */}
      {(c.missing_requirements.length > 0 || c.tips.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {c.missing_requirements.length > 0 && (
            <div className="rounded-3xl bg-amber-500/5 border border-amber-500/20 p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-3"><ListChecks className="w-4 h-4" /> {dict.missingTitle}</p>
              <ul className="space-y-1.5">{c.missing_requirements.map((m, i) => <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-300">• {m}</li>)}</ul>
            </div>
          )}
          {c.tips.length > 0 && (
            <div className="rounded-3xl bg-green-500/5 border border-green-500/20 p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-green-600 dark:text-green-400 mb-3"><Lightbulb className="w-4 h-4" /> {dict.tipsTitle}</p>
              <ul className="space-y-1.5">{c.tips.map((t, i) => <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-300">• {t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">
        <span className="text-green-500">{icon}</span> {title}
      </p>
      {children}
    </div>
  );
}
