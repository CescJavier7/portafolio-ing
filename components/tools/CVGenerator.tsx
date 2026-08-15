'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles, Upload, Trash2, Download, ArrowUpRight, Lock,
  Target, ListChecks, Lightbulb, Plus, FileUp, Send, Copy, Check, X, Mail, Wand2, Loader2, GraduationCap,
} from 'lucide-react';
import {
  sentraGenerateCV, sentraOcrJobPosting, sentraExtractCVPdf, sentraApplyEmail,
  sentraListCVs, sentraGetCV, sentraDeleteCV, sentraUpdateCV, sentraImproveCV,
  SentraApiError,
  type SentraCVDocument, type SentraCVListItem, type SentraApplyEmail,
  type CVContent, type CVExperienceItem,
} from '@/lib/sentra/api';
import { openCVPdf } from '@/lib/sentra/cvPdf';
import { useSentraSession } from '@/lib/sentra/useSession';
import { useAutoSave, clearDraft } from '@/lib/sentra/useAutoSave';
import CVTour, { type CVTourDict } from '@/components/tools/CVTour';

// Chequeo cliente de "texto legible" (espejo del backend text_guard): evita
// mandar a generar un blob sin espacios (bug de extracción de PDF).
function looksUnreadable(text: string): boolean {
  if (text.length < 200) return false;
  const spaceRatio = (text.match(/ /g)?.length ?? 0) / text.length;
  const longestRun = Math.max(0, ...text.split(/\s+/).map((w) => w.length));
  return spaceRatio < 0.04 || longestRun > 60;
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
                      {pdfBusy ? dict.pdfBusy : dict.uploadCv}
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

            {/* RESULTADO */}
            {result && (
              <CVResult
                cv={result}
                dict={dict}
                onNew={() => { setResult(null); setError(null); }}
                onImproved={(doc) => {
                  // La mejora crea una VERSIÓN nueva: se muestra y entra al historial.
                  setResult(doc);
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

function CVResult({ cv, dict, onNew, onImproved }: { cv: SentraCVDocument; dict: CVDict; onNew: () => void; onImproved: (doc: SentraCVDocument) => void }) {
  // Vista previa EDITABLE: el contenido es estado local. El PDF, el guardado
  // y la mejora usan estas ediciones. Se re-sincroniza si cambia el CV (tras mejorar).
  const [content, setContent] = useState<CVContent>(cv.content);
  useEffect(() => { setContent(cv.content); }, [cv.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const c = content;

  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [email, setEmail] = useState<SentraApplyEmail | null>(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Quita líneas vacías de los arrays antes de enviar/compilar el PDF.
  function clean(x: CVContent): CVContent {
    return {
      ...x,
      education: x.education.filter((s) => s.trim()),
      skills: x.skills.filter((s) => s.trim()),
      languages: x.languages.filter((s) => s.trim()),
      experience: x.experience.map((e) => ({ ...e, highlights: e.highlights.filter((h) => h.trim()) })),
    };
  }
  function setField<K extends keyof CVContent>(key: K, value: CVContent[K]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }
  function setExp(i: number, patch: Partial<CVExperienceItem>) {
    setContent((prev) => ({ ...prev, experience: prev.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));
  }
  function addExp() {
    setContent((prev) => ({ ...prev, experience: [...prev.experience, { role: '', company: '', period: '', highlights: [] }] }));
  }
  function removeExp(i: number) {
    setContent((prev) => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }));
  }

  function downloadPdf() {
    sentraUpdateCV(cv.id, { content: clean(content) }).catch(() => {}); // persiste ediciones (best-effort)
    openCVPdf(clean(content), dict.pdf);
  }

  async function applyImprovements() {
    setImproving(true);
    setImproveError(null);
    try {
      // Envía el CV EDITADO; el backend lo reescribe y crea una versión nueva (1 crédito).
      const doc = await sentraImproveCV(cv.id, clean(content));
      onImproved(doc);
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) setImproveError(dict.limitReached);
      else setImproveError(err instanceof SentraApiError ? err.detail : dict.errorGeneric);
    } finally {
      setImproving(false);
    }
  }

  async function openApply() {
    setApplyOpen(true);
    if (email) return;
    setApplyBusy(true);
    setApplyError(null);
    try {
      // Guarda las ediciones antes: el correo se redacta desde el CV guardado.
      await sentraUpdateCV(cv.id, { content: clean(content) }).catch(() => {});
      const e = await sentraApplyEmail(cv.id);
      setEmail(e);
      setRecipient(e.recipient);
      setSubject(e.subject);
      setBody(e.body);
    } catch (err) {
      setApplyError(err instanceof SentraApiError ? err.detail : 'No se pudo redactar el correo.');
    } finally {
      setApplyBusy(false);
    }
  }

  function openMailClient() {
    // mailto NO adjunta archivos (seguridad del navegador): descargamos el CV
    // editado para que el usuario lo arrastre.
    openCVPdf(clean(content), dict.pdf);
    const to = recipient.trim();
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  const suggestions = c.actionable_suggestions?.length ? c.actionable_suggestions : c.tips;
  const fieldLabel = 'block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5';

  return (
    <div className="space-y-6">
      {/* Cabecera con match score + acciones */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div
          className="shrink-0 w-24 h-24 rounded-2xl border-4 flex flex-col items-center justify-center"
          style={{ borderColor: matchColor(c.match_score), color: matchColor(c.match_score) }}
        >
          <span className="text-3xl font-black leading-none">{c.match_score}%</span>
          <span className="text-[10px] font-bold uppercase mt-1">{dict.matchLabel}</span>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">{c.full_name || cv.title}</h2>
          <p className="text-[14px] text-green-600 dark:text-green-400 font-semibold">{c.headline}</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0 justify-center">
          <button onClick={applyImprovements} disabled={improving} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600 text-white text-[13px] font-bold hover:scale-[1.02] transition-transform disabled:opacity-60">
            <Wand2 className={`w-4 h-4 ${improving ? 'animate-pulse' : ''}`} /> {improving ? dict.improving : dict.applyImprovements}
          </button>
          <button onClick={openApply} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-green-500 text-black text-[13px] font-bold hover:scale-[1.02] transition-transform">
            <Send className="w-4 h-4" /> {dict.apply}
          </button>
          <button onClick={downloadPdf} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5">
            <Download className="w-4 h-4" /> {dict.downloadPdf}
          </button>
          <button onClick={onNew} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5">
            <Plus className="w-4 h-4" /> {dict.newCv}
          </button>
        </div>
      </div>

      {improveError && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{improveError}</p>
      )}

      {/* Panel One-Click Apply */}
      {applyOpen && (
        <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-green-500/30 shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <p className="flex items-center gap-2 text-sm font-black tracking-tight text-zinc-900 dark:text-white">
              <Mail className="w-4 h-4 text-green-500" /> {dict.applyTitle}
            </p>
            <button onClick={() => setApplyOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {applyBusy ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-6 text-center">{dict.applyBusy}</p>
          ) : applyError ? (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{applyError}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{dict.applyRecipient}</label>
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={dict.applyRecipientPlaceholder}
                  className={inputBase}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{dict.applySubject}</label>
                <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputBase} />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{dict.applyBody}</label>
                <textarea rows={9} value={body} onChange={(e) => setBody(e.target.value)} className={`${inputBase} resize-y`} />
              </div>

              <p className="text-[12px] text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 leading-relaxed">
                {dict.applyInstruction}
              </p>

              <div className="flex flex-wrap gap-3">
                <button onClick={openMailClient} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500 text-black text-[13px] font-bold hover:scale-[1.02] transition-transform">
                  <Mail className="w-4 h-4" /> {dict.applyOpenMail}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(body);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? dict.applyCopied : dict.applyCopyBody}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contenido del CV — EDITABLE */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8 space-y-5">
        <p className="text-[12px] text-zinc-400 dark:text-zinc-500">{dict.editHint}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>{dict.fName}</label>
            <input value={c.full_name} onChange={(ev) => setField('full_name', ev.target.value)} className={inputBase} />
          </div>
          <div>
            <label className={fieldLabel}>{dict.fHeadline}</label>
            <input value={c.headline} onChange={(ev) => setField('headline', ev.target.value)} className={inputBase} />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>{dict.summaryTitle}</label>
          <textarea rows={3} value={c.summary} onChange={(ev) => setField('summary', ev.target.value)} className={`${inputBase} resize-y`} />
        </div>

        <div>
          <label className={fieldLabel}>{dict.experienceTitle}</label>
          <div className="space-y-3">
            {c.experience.map((e, i) => (
              <div key={i} className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5">
                <button type="button" onClick={() => removeExp(i)} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500" aria-label="Quitar">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pr-8">
                  <input placeholder={dict.fRole} value={e.role} onChange={(ev) => setExp(i, { role: ev.target.value })} className={inputBase} />
                  <input placeholder={dict.fCompany} value={e.company} onChange={(ev) => setExp(i, { company: ev.target.value })} className={inputBase} />
                  <input placeholder={dict.fPeriod} value={e.period} onChange={(ev) => setExp(i, { period: ev.target.value })} className={inputBase} />
                </div>
                <textarea
                  placeholder={dict.fHighlights}
                  rows={3}
                  value={e.highlights.join('\n')}
                  onChange={(ev) => setExp(i, { highlights: ev.target.value.split('\n') })}
                  className={`${inputBase} resize-y`}
                />
              </div>
            ))}
            <button type="button" onClick={addExp} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline">
              <Plus className="w-3.5 h-3.5" /> {dict.addExperience}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>{dict.skillsTitle} <span className="normal-case font-normal text-zinc-400">· {dict.linesHint}</span></label>
            <textarea rows={5} value={c.skills.join('\n')} onChange={(ev) => setField('skills', ev.target.value.split('\n'))} className={`${inputBase} resize-y`} />
          </div>
          <div>
            <label className={fieldLabel}>{dict.languagesTitle} <span className="normal-case font-normal text-zinc-400">· {dict.linesHint}</span></label>
            <textarea rows={5} value={c.languages.join('\n')} onChange={(ev) => setField('languages', ev.target.value.split('\n'))} className={`${inputBase} resize-y`} />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>{dict.educationTitle} <span className="normal-case font-normal text-zinc-400">· {dict.linesHint}</span></label>
          <textarea rows={3} value={c.education.join('\n')} onChange={(ev) => setField('education', ev.target.value.split('\n'))} className={`${inputBase} resize-y`} />
        </div>
      </div>

      {/* Análisis del match (el diferenciador) */}
      {(c.missing_requirements.length > 0 || suggestions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {c.missing_requirements.length > 0 && (
            <div className="rounded-3xl bg-amber-500/5 border border-amber-500/20 p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-3"><ListChecks className="w-4 h-4" /> {dict.missingTitle}</p>
              <ul className="space-y-1.5">{c.missing_requirements.map((m, i) => <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-300">• {m}</li>)}</ul>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="rounded-3xl bg-violet-500/5 border border-violet-500/20 p-6">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400 mb-3"><Lightbulb className="w-4 h-4" /> {dict.tipsTitle}</p>
              <ul className="space-y-1.5">{suggestions.map((t, i) => <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-300">• {t}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

