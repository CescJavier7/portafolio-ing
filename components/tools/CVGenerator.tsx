'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles, Upload, Trash2, ArrowUpRight, Lock,
  Target, ListChecks, FileUp, Loader2, GraduationCap,
} from 'lucide-react';
import {
  sentraGenerateCV, sentraOcrJobPosting, sentraExtractCVPdf,
  sentraListCVs, sentraGetCV, sentraDeleteCV,
  SentraApiError,
  type SentraCVDocument, type SentraCVListItem,
} from '@/lib/sentra/api';
import { useSentraSession } from '@/lib/sentra/useSession';
import { useAutoSave, clearDraft } from '@/lib/sentra/useAutoSave';
import CVTour, { type CVTourDict } from '@/components/tools/CVTour';
import CVWizard from '@/components/tools/CVWizard';

// Chequeo cliente de "texto legible" (espejo EXACTO del backend text_guard):
// la señal fuerte es la longitud media de palabra. Un PDF de Canva (glifos sin
// espacios) da palabras enormes → se detecta y se avisa antes de generar.
function looksUnreadable(text: string): boolean {
  if (text.length < 120) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const avgWord = words.reduce((a, w) => a + w.length, 0) / words.length;
  const longest = Math.max(...words.map((w) => w.length));
  return avgWord < 1.6 || avgWord > 11 || longest > 40;
}

const DRAFT_PROFILE = 'cv_draft_profile';
const DRAFT_JOB = 'cv_draft_job';

// Procesa una lista de archivos (PDF → extracción, imagen → OCR) y concatena
// el texto. Cada llamada valida el archivo en el backend (magic numbers, 5MB).
async function extractFromFiles(files: File[]): Promise<string> {
  const parts: string[] = [];
  for (const f of files) {
    const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
    const { text } = isPdf ? await sentraExtractCVPdf(f) : await sentraOcrJobPosting(f);
    if (text?.trim()) parts.push(text.trim());
  }
  return parts.join('\n\n');
}

function imagesFromPaste(e: React.ClipboardEvent): File[] {
  return Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
}

function appendText(prev: string, added: string): string {
  return [prev.trim(), added.trim()].filter(Boolean).join('\n\n');
}

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
  uploadPdf: string;
  uploadCv: string;
  pdfBusy: string;
  reading: string;
  unreadableText: string;
  tutorial: string;
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
  apply: string;
  applyBusy: string;
  applyTitle: string;
  applyRecipient: string;
  applyRecipientPlaceholder: string;
  applySubject: string;
  applyBody: string;
  applyOpenMail: string;
  applyCopyBody: string;
  applyCopied: string;
  applyInstruction: string;
  historyTitle: string;
  historyEmpty: string;
  open: string;
  delete: string;
  errorGeneric: string;
  limitReached: string;
  upgrade: string;
  applyImprovements: string;
  improving: string;
  editHint: string;
  fName: string;
  fHeadline: string;
  fRole: string;
  fCompany: string;
  fPeriod: string;
  fHighlights: string;
  addExperience: string;
  linesHint: string;
  wizard: {
    steps: { personal: string; experience: string; education: string; skills: string; review: string };
    intro: { personal: string; experience: string; education: string; skills: string; review: string };
    stepOf: string;
    back: string;
    next: string;
    sendApplication: string;
    magic: string;
    magicHint: string;
    aiLeft: string;
    aiUnlimited: string;
    aiLocked: string;
    previewTitle: string;
    previewEmpty: string;
    saving: string;
    saved: string;
    reviewClear: string;
  };
  pdf: {
    summary: string;
    experience: string;
    education: string;
    skills: string;
    languages: string;
    generatedBy: string;
  };
  tour: CVTourDict;
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
  const [pdfBusy, setPdfBusy] = useState(false);
  const [tourSignal, setTourSignal] = useState(0); // >0 = disparar tutorial a mano
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  // Auto-guardado tipo Word de los dos campos largos.
  useAutoSave(DRAFT_PROFILE, profileText, setProfileText);
  useAutoSave(DRAFT_JOB, jobPosting, setJobPosting);

  useEffect(() => {
    if (user) sentraListCVs().then(setHistory).catch(() => {});
  }, [user]);

  const showErr = (err: unknown) =>
    setError(err instanceof SentraApiError ? err.detail : err instanceof Error ? err.message : dict.errorGeneric);

  // Perfil: acepta MÚLTIPLES archivos (PDF + imágenes). Itera, hace OCR/extracción
  // y CONCATENA todo en el textarea (útil para un CV de varias fotos/páginas).
  async function processProfileFiles(files: File[]) {
    if (files.length === 0) return;
    setPdfBusy(true);
    setError(null);
    try {
      const text = await extractFromFiles(files);
      setProfileText((prev) => appendText(prev, text));
    } catch (err) {
      showErr(err);
    } finally {
      setPdfBusy(false);
      if (pdfRef.current) pdfRef.current.value = '';
    }
  }

  async function handleProfileFile(e: React.ChangeEvent<HTMLInputElement>) {
    await processProfileFiles(Array.from(e.target.files ?? []));
  }

  // Ctrl+V con imagen(es) en el portapapeles sobre "Tu experiencia": las captura
  // y las procesa (varias permitidas). Si no hay imagen, deja pegar texto normal.
  async function handleProfilePaste(e: React.ClipboardEvent) {
    const imgs = imagesFromPaste(e);
    if (imgs.length === 0) return;
    e.preventDefault();
    await processProfileFiles(imgs);
  }

  // Oferta: ESTRICTAMENTE 1 archivo/imagen.
  async function processJobFile(file: File | undefined) {
    if (!file) return;
    setOcrBusy(true);
    setError(null);
    try {
      const { text } = await sentraOcrJobPosting(file);
      setJobPosting((prev) => appendText(prev, text)); // el usuario revisa antes de generar
    } catch (err) {
      showErr(err);
    } finally {
      setOcrBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    await processJobFile(e.target.files?.[0]);
  }

  async function handleJobPaste(e: React.ClipboardEvent) {
    const imgs = imagesFromPaste(e);
    if (imgs.length === 0) return;
    e.preventDefault();
    await processJobFile(imgs[0]); // solo la primera: la oferta es 1 imagen
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    // Chequeo cliente: si el texto salió sin espacios (PDF roto), avisamos YA,
    // sin llamar al servidor ni gastar tiempo.
    if (looksUnreadable(profileText) || looksUnreadable(jobPosting)) {
      setError(dict.unreadableText);
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const cv = await sentraGenerateCV({ profile_text: profileText, job_posting: jobPosting });
      clearDraft(DRAFT_PROFILE, DRAFT_JOB); // ya se generó: borrador cumplido
      setResult(cv);
      setHistory((prev) => [
        { id: cv.id, title: cv.title, match_score: cv.match_score, created_at: cv.created_at, updated_at: cv.updated_at },
        ...prev,
      ]);
    } catch (err) {
      // Mostramos el motivo REAL del backend (SentraApiError.detail); errorGeneric
      // queda SOLO para fallos que no traen mensaje (ej. red caída).
      if (err instanceof SentraApiError) setError(err.status === 402 ? dict.limitReached : err.detail);
      else setError(dict.errorGeneric);
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
            {/* Tour interactivo: automático la 1ª vez + manual desde el botón flotante */}
            <CVTour dict={dict.tour} runSignal={tourSignal} />

            {/* Botón flotante del tutorial — SOLO en la herramienta (form visible),
                sobre el chat MekaSenkuChat (que vive abajo a la derecha). */}
            {!result && (
              <button
                type="button"
                onClick={() => setTourSignal((s) => s + 1)}
                aria-label={dict.tutorial}
                className="group fixed bottom-24 right-5 z-40 inline-flex items-center gap-2 h-12 pl-3.5 pr-4 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 shadow-lg text-zinc-700 dark:text-zinc-200 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition-all"
              >
                <GraduationCap className="w-5 h-5 shrink-0" />
                <span className="text-[13px] font-semibold max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[140px] transition-all duration-300">
                  {dict.tutorial}
                </span>
              </button>
            )}

            {/* HERRAMIENTA */}
            {!result && (
              <form onSubmit={handleGenerate} className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8 space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dict.profileLabel}</label>
                    <button
                      type="button"
                      onClick={() => pdfRef.current?.click()}
                      disabled={pdfBusy}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-600 dark:text-green-400 hover:underline disabled:opacity-60 transition-colors"
                    >
                      {pdfBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                      {pdfBusy ? dict.reading : dict.uploadCv}
                    </button>
                    <input ref={pdfRef} type="file" accept="application/pdf,image/jpeg,image/png" multiple onChange={handleProfileFile} className="hidden" />
                  </div>
                  <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-2">{dict.profileHint}</p>
                  <textarea
                    id="cv-profile"
                    required
                    minLength={30}
                    rows={7}
                    value={profileText}
                    onChange={(e) => setProfileText(e.target.value)}
                    onPaste={handleProfilePaste}
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
                      {ocrBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {ocrBusy ? dict.ocrBusy : dict.uploadImage}
                    </button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleImage} className="hidden" />
                  </div>
                  <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-2">{dict.jobHint}</p>
                  <textarea
                    id="cv-job"
                    required
                    minLength={30}
                    rows={7}
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    onPaste={handleJobPaste}
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
                  id="cv-generate"
                  type="submit"
                  disabled={generating}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-60"
                >
                  <Sparkles className={`w-4 h-4 ${generating ? 'animate-pulse' : ''}`} />
                  {generating ? dict.generating : dict.generate}
                </button>
              </form>
            )}

            {/* RESULTADO — asistente split-screen (stepper + vista previa A4 en vivo) */}
            {result && (
              <CVWizard
                cv={result}
                dict={dict}
                lang={lang}
                onNew={() => { setResult(null); setError(null); }}
                onVersion={(doc) => {
                  // La mejora con IA crea una VERSIÓN nueva: entra al historial.
                  // NO tocamos `result` (ancla del wizard) para no re-hidratar el
                  // store y expulsar al usuario del paso donde está.
                  setHistory((prev) => [
                    { id: doc.id, title: doc.title, match_score: doc.match_score, created_at: doc.created_at, updated_at: doc.updated_at },
                    ...prev,
                  ]);
                }}
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
