'use client';

// components/tools/CVWizard.tsx
//
// Editor de CV en split-screen: a la IZQUIERDA un asistente por pasos (stepper)
// con formularios; a la DERECHA una vista previa A4 EN VIVO que espeja el PDF
// real (lib/sentra/cvPdf.ts) — cero llamadas al backend para previsualizar.
//
// Reglas de negocio:
//  - Autosave al backend (PUT /cv/{id}) con debounce: durabilidad real, tipo
//    editor pro. La descarga y el correo usan siempre el contenido limpio.
//  - La "varita" (Mejorar con IA) reescribe TODO el CV para subir el match y
//    CONSUME 1 crédito (crea una versión nueva). Se BLOQUEA al agotar la quota
//    semanal, pero el editor manual sigue 100% funcional.
//  - Envío de postulación: la IA redacta el correo; mailto no adjunta archivos
//    (seguridad del navegador), así que descargamos el PDF para adjuntarlo.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Wand2, Download, Send, Plus, Trash2, ArrowLeft, ArrowRight, Mail, X, Copy,
  Check, Lock, Loader2, ListChecks, Lightbulb, Cloud, Folder, FolderPlus, ExternalLink, AlertCircle,
} from 'lucide-react';
import {
  sentraUpdateCV, sentraImproveCV, sentraApplyEmail, sentraCVQuota,
  sentraListCVFolders, sentraCreateCVFolder, SentraApiError,
  type SentraCVDocument, type SentraApplyEmail, type SentraCVQuota, type CVContent,
  type SentraCVFolder,
} from '@/lib/sentra/api';
import { openCVPdf } from '@/lib/sentra/cvPdf';
import { useCVWizard, cvWizard, cleanCVContent, CV_STEPS, type CVStep } from '@/lib/sentra/cvStore';
import { matchColor, matchTint } from '@/lib/sentra/matchScore';
import { validateCV, type CVFieldErrors } from '@/lib/sentra/cvSchema';
import type { CVDict } from '@/components/tools/CVGenerator';

const inputBase =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50';
const fieldLabel =
  'block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5';

function fill(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

interface CVWizardProps {
  cv: SentraCVDocument; // versión ANCLA: no cambia al mejorar (evita re-hidratar y expulsar del paso)
  dict: CVDict;
  lang: string;
  onNew: () => void;
  onVersion: (doc: SentraCVDocument) => void; // nueva versión (mejora) → historial del padre
}

export default function CVWizard({ cv, dict, lang, onNew, onVersion }: CVWizardProps) {
  const { content, cvId, step } = useCVWizard();
  const wd = dict.wizard;

  // Validación de completitud (Zod): bloquea descarga/envío y marca campos en
  // rojo hasta que el CV esté 100% completo (nombre, titular, resumen, y cada
  // experiencia con cargo + fecha + descripción, más habilidades y formación).
  const validation = validateCV(content);

  // Hidrata el store al montar / al abrir otro CV del historial.
  useEffect(() => {
    cvWizard.hydrate(cv);
  }, [cv.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Quota de IA ────────────────────────────────────────────────────
  const [quota, setQuota] = useState<SentraCVQuota | null>(null);
  useEffect(() => {
    sentraCVQuota().then(setQuota).catch(() => {});
  }, []);
  const aiLocked = quota != null && quota.remaining === 0;

  // ── Carpetas / categorías ──────────────────────────────────────────
  const [folders, setFolders] = useState<SentraCVFolder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(cv.folder_id);
  useEffect(() => {
    sentraListCVFolders().then(setFolders).catch(() => {});
  }, []);
  useEffect(() => {
    setFolderId(cv.folder_id);
  }, [cv.id]);

  // Asigna (o quita, con null) la carpeta del CV actual y lo persiste.
  async function assignFolder(id: string | null) {
    setFolderId(id);
    if (cvId) sentraUpdateCV(cvId, { folder_id: id, set_folder: true }).catch(() => {});
  }

  // Crea una carpeta (idempotente en backend) y asigna el CV a ella.
  async function createAndAssignFolder(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      const folder = await sentraCreateCVFolder(trimmed);
      setFolders((prev) => (prev.some((f) => f.id === folder.id) ? prev : [...prev, folder]));
      await assignFolder(folder.id);
    } catch {
      /* best-effort: el select manual sigue disponible */
    }
  }

  // ── Autosave al backend (debounced) ────────────────────────────────
  const savedRef = useRef<string>('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => {
    savedRef.current = JSON.stringify(cv.content);
    setSaveState('idle');
  }, [cv.id]);
  useEffect(() => {
    if (!cvId) return;
    const json = JSON.stringify(content);
    if (json === savedRef.current) return;
    setSaveState('saving');
    const timer = setTimeout(() => {
      sentraUpdateCV(cvId, { content: cleanCVContent(content) })
        .then(() => {
          savedRef.current = json;
          setSaveState('saved');
        })
        .catch(() => setSaveState('idle')); // best-effort: descargar/enviar sigue funcionando
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, cvId]);

  // ── Varita: mejora con IA (consume 1 crédito) ──────────────────────
  const [improving, setImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function runMagic() {
    if (aiLocked || improving) return;
    setImproving(true);
    setError(null);
    try {
      const doc = await sentraImproveCV(cvId ?? cv.id, cleanCVContent(content));
      cvWizard.setContent(doc.content); // no toca el paso actual
      cvWizard.setCvId(doc.id);
      savedRef.current = JSON.stringify(doc.content); // ya persistido por el improve
      setSaveState('saved');
      onVersion(doc);
      setQuota((q) =>
        q && q.remaining != null ? { ...q, used: q.used + 1, remaining: Math.max(0, q.remaining - 1) } : q,
      );
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) {
        setError(dict.limitReached);
        setQuota((q) => (q ? { ...q, remaining: 0 } : q)); // el servidor confirma el agote
      } else {
        setError(err instanceof SentraApiError ? err.detail : dict.errorGeneric);
      }
    } finally {
      setImproving(false);
    }
  }

  function downloadPdf() {
    const clean = cleanCVContent(content);
    if (cvId) sentraUpdateCV(cvId, { content: clean }).catch(() => {});
    openCVPdf(clean, dict.pdf);
  }

  // ── Postulación (correo IA) ────────────────────────────────────────
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyBusy, setApplyBusy] = useState(false);
  const [emailData, setEmailData] = useState<SentraApplyEmail | null>(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  async function openApply() {
    setApplyOpen(true);
    if (emailData) return;
    setApplyBusy(true);
    setApplyError(null);
    try {
      const clean = cleanCVContent(content);
      if (cvId) await sentraUpdateCV(cvId, { content: clean }).catch(() => {});
      const e = await sentraApplyEmail(cvId ?? cv.id);
      setEmailData(e);
      setRecipient(e.recipient);
      setSubject(e.subject);
      setBody(e.body);
    } catch (err) {
      setApplyError(err instanceof SentraApiError ? err.detail : dict.errorGeneric);
    } finally {
      setApplyBusy(false);
    }
  }

  // Ambos flujos descargan primero el PDF (mailto/Gmail web no adjuntan archivos
  // locales por seguridad del navegador) para que el usuario lo arrastre.
  function openMailClient() {
    openCVPdf(cleanCVContent(content), dict.pdf);
    window.location.href = `mailto:${recipient.trim()}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  function openGmail() {
    openCVPdf(cleanCVContent(content), dict.pdf);
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipient.trim(),
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const isLast = step === CV_STEPS.length - 1;

  return (
    <div className="space-y-6">
      {/* ── Barra superior: match + quota + acciones globales ── */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className="shrink-0 w-16 h-16 rounded-2xl border-4 flex flex-col items-center justify-center"
            style={{
              borderColor: matchColor(content.match_score),
              color: matchColor(content.match_score),
              backgroundColor: matchTint(content.match_score),
            }}
          >
            <span className="text-xl font-black leading-none">{content.match_score}%</span>
            <span className="text-[8px] font-bold uppercase mt-0.5">{dict.matchLabel}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white truncate">
              {content.full_name || cv.title}
            </h2>
            <p className="text-[13px] text-green-600 dark:text-green-400 font-semibold truncate">
              {content.headline}
            </p>
            <QuotaBadge quota={quota} wd={wd} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={runMagic}
            disabled={improving || aiLocked}
            title={aiLocked ? wd.aiLocked : wd.magicHint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600 text-white text-[13px] font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {aiLocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Wand2 className={`w-4 h-4 ${improving ? 'animate-pulse' : ''}`} />
            )}
            {improving ? dict.improving : wd.magic}
          </button>
          <button
            onClick={downloadPdf}
            disabled={!validation.ok}
            title={validation.ok ? dict.downloadPdf : wd.incompleteTitle}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Download className="w-4 h-4" /> {dict.downloadPdf}
          </button>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5"
          >
            <Plus className="w-4 h-4" /> {dict.newCv}
          </button>
        </div>
      </div>

      {aiLocked && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3">
          <Lock className="w-4 h-4 shrink-0" />
          <span>{wd.aiLocked}</span>
          <Link href={`/${lang}/sentinel/precios`} className="font-bold underline">
            {dict.upgrade}
          </Link>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">{error}</p>
      )}

      {/* Aviso de completitud: qué falta para poder descargar/enviar. */}
      {!validation.ok && (
        <div className="rounded-2xl bg-red-500/5 border border-red-500/20 px-4 py-3">
          <p className="flex items-center gap-2 text-[13px] font-bold text-red-600 dark:text-red-400 mb-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" /> {wd.incompleteTitle}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-red-600/90 dark:text-red-400/90">
            {validation.missing.slice(0, 8).map((m, i) => (
              <li key={i}>• {m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Split-screen ── */}
      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
        {/* IZQUIERDA: asistente */}
        <div className="space-y-5 min-w-0">
          <Stepper step={step} labels={wd.steps} onGo={(i) => cvWizard.setStep(i)} />

          <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-7">
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-5">
              {fill(wd.stepOf, { n: step + 1, total: CV_STEPS.length })} · {wd.intro[CV_STEPS[step]]}
            </p>
            <StepBody
              step={CV_STEPS[step]}
              content={content}
              dict={dict}
              onApply={openApply}
              folders={folders}
              folderId={folderId}
              onAssignFolder={assignFolder}
              onCreateFolder={createAndAssignFolder}
              errors={validation.errors}
              canSend={validation.ok}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => cvWizard.prev()}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> {wd.back}
            </button>
            {isLast ? (
              <button
                onClick={openApply}
                disabled={!validation.ok}
                title={validation.ok ? wd.sendApplication : wd.incompleteTitle}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-500 text-black text-[13px] font-bold hover:scale-[1.02] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Send className="w-4 h-4" /> {wd.sendApplication}
              </button>
            ) : (
              <button
                onClick={() => cvWizard.next()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-green-500 text-black text-[13px] font-bold hover:scale-[1.02] transition-transform"
              >
                {wd.next} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* DERECHA: vista previa A4 en vivo */}
        <div className="lg:sticky lg:top-24 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {wd.previewTitle}
            </p>
            <SaveIndicator state={saveState} wd={wd} />
          </div>
          <CVPreviewA4 content={content} labels={dict.pdf} empty={wd.previewEmpty} />
        </div>
      </div>

      {/* ── Modal de postulación ── */}
      {applyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4"
          onClick={() => setApplyOpen(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 md:p-7 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="flex items-center gap-2 text-sm font-black tracking-tight text-zinc-900 dark:text-white">
                <Mail className="w-4 h-4 text-green-500" /> {dict.applyTitle}
              </p>
              <button
                onClick={() => setApplyOpen(false)}
                className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {applyBusy ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-8 text-center">
                {dict.applyBusy}
              </p>
            ) : applyError ? (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {applyError}
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={fieldLabel}>{dict.applyRecipient}</label>
                  <input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={dict.applyRecipientPlaceholder}
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className={fieldLabel}>{dict.applySubject}</label>
                  <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputBase} />
                </div>
                <div>
                  <label className={fieldLabel}>{dict.applyBody}</label>
                  <textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} className={`${inputBase} resize-y`} />
                </div>

                <p className="text-[12px] text-amber-600 dark:text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3 leading-relaxed">
                  {dict.applyInstruction}
                </p>

                {/* Dos vías grandes: Gmail (web) y Mail/Outlook (mailto). */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={openGmail}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-red-500 text-white text-[13px] font-bold hover:scale-[1.02] transition-transform"
                  >
                    <ExternalLink className="w-4 h-4" /> {dict.applyOpenGmail}
                  </button>
                  <button
                    onClick={openMailClient}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black text-[13px] font-bold hover:scale-[1.02] transition-transform"
                  >
                    <Mail className="w-4 h-4" /> {dict.applyOpenMail}
                  </button>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(body);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? dict.applyCopied : dict.applyCopyBody}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────

function QuotaBadge({ quota, wd }: { quota: SentraCVQuota | null; wd: CVDict['wizard'] }) {
  if (!quota) return null;
  const unlimited = quota.remaining == null;
  return (
    <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
      <Wand2 className="w-3 h-3" />
      {unlimited ? wd.aiUnlimited : fill(wd.aiLeft, { n: quota.remaining as number })}
    </p>
  );
}

function SaveIndicator({ state, wd }: { state: 'idle' | 'saving' | 'saved'; wd: CVDict['wizard'] }) {
  if (state === 'idle') return null;
  const saving = state === 'saving';
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
      {saving ? wd.saving : wd.saved}
    </span>
  );
}

function Stepper({
  step,
  labels,
  onGo,
}: {
  step: number;
  labels: Record<CVStep, string>;
  onGo: (i: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {CV_STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={s} className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button type="button" onClick={() => onGo(i)} className="flex items-center gap-2 group">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black border-2 transition-colors ${
                  active
                    ? 'bg-green-500 border-green-500 text-black'
                    : done
                      ? 'bg-green-500/15 border-green-500 text-green-600 dark:text-green-400'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 group-hover:border-green-400'
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span
                className={`hidden sm:inline text-[12px] font-semibold whitespace-nowrap ${
                  active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {labels[s]}
              </span>
            </button>
            {i < CV_STEPS.length - 1 && <span className="w-4 sm:w-6 h-px bg-zinc-300 dark:bg-zinc-700" />}
          </li>
        );
      })}
    </ol>
  );
}

// Añade borde rojo a un input cuando tiene error de completitud.
const errRing = (msg?: string) =>
  msg ? ' border-red-400 dark:border-red-500/60 focus:ring-red-500/40' : '';
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-[11px] font-semibold text-red-500">{msg}</p>;
}

function StepBody({
  step,
  content,
  dict,
  onApply,
  folders,
  folderId,
  onAssignFolder,
  onCreateFolder,
  errors,
  canSend,
}: {
  step: CVStep;
  content: CVContent;
  dict: CVDict;
  onApply: () => void;
  folders: SentraCVFolder[];
  folderId: string | null;
  onAssignFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  errors: CVFieldErrors;
  canSend: boolean;
}) {
  const c = content;

  if (step === 'personal') {
    const contact = c.contact ?? { location: '', email: '', phone: '', website: '' };
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>{dict.fName}</label>
            <input value={c.full_name} onChange={(e) => cvWizard.setField('full_name', e.target.value)} className={inputBase + errRing(errors.full_name)} />
            <FieldError msg={errors.full_name} />
          </div>
          <div>
            <label className={fieldLabel}>{dict.fHeadline}</label>
            <input value={c.headline} onChange={(e) => cvWizard.setField('headline', e.target.value)} className={inputBase + errRing(errors.headline)} />
            <FieldError msg={errors.headline} />
          </div>
        </div>
        <div>
          <label className={fieldLabel}>{dict.summaryTitle}</label>
          <textarea
            rows={4}
            value={c.summary}
            onChange={(e) => cvWizard.setField('summary', e.target.value)}
            className={`${inputBase} resize-y${errRing(errors.summary)}`}
          />
          <FieldError msg={errors.summary} />
        </div>

        {/* Contacto (cabecera del CV) — grid 2×2 */}
        <div>
          <label className={fieldLabel}>{dict.wizard.contactTitle}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              placeholder={dict.wizard.contactLocation}
              value={contact.location}
              onChange={(e) => cvWizard.setContact('location', e.target.value)}
              className={inputBase}
            />
            <input
              type="email"
              placeholder={dict.wizard.contactEmail}
              value={contact.email}
              onChange={(e) => cvWizard.setContact('email', e.target.value)}
              className={inputBase}
            />
            <input
              type="tel"
              placeholder={dict.wizard.contactPhone}
              value={contact.phone}
              onChange={(e) => cvWizard.setContact('phone', e.target.value)}
              className={inputBase}
            />
            <input
              placeholder={dict.wizard.contactWebsite}
              value={contact.website}
              onChange={(e) => cvWizard.setContact('website', e.target.value)}
              className={inputBase}
            />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'experience') {
    return (
      <div className="space-y-3">
        {c.experience.map((e, i) => {
          const exErr = errors.experience[i] ?? {};
          return (
            <div key={i} className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5">
              <button
                type="button"
                onClick={() => cvWizard.removeExperience(i)}
                className="absolute top-3 right-3 text-zinc-400 hover:text-red-500"
                aria-label="Quitar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pr-8">
                <div>
                  <input placeholder={dict.fRole} value={e.role} onChange={(ev) => cvWizard.setExperience(i, { role: ev.target.value })} className={inputBase + errRing(exErr.role)} />
                  <FieldError msg={exErr.role} />
                </div>
                <input placeholder={dict.fCompany} value={e.company} onChange={(ev) => cvWizard.setExperience(i, { company: ev.target.value })} className={inputBase} />
                <div>
                  <input placeholder={dict.fPeriod} value={e.period} onChange={(ev) => cvWizard.setExperience(i, { period: ev.target.value })} className={inputBase + errRing(exErr.period)} />
                  <FieldError msg={exErr.period} />
                </div>
              </div>
              <textarea
                placeholder={dict.fHighlights}
                rows={3}
                value={e.highlights.join('\n')}
                onChange={(ev) => cvWizard.setExperience(i, { highlights: ev.target.value.split('\n') })}
                className={`${inputBase} resize-y${errRing(exErr.highlights)}`}
              />
              <FieldError msg={exErr.highlights} />
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => cvWizard.addExperience()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> {dict.addExperience}
        </button>
      </div>
    );
  }

  if (step === 'education') {
    return (
      <div>
        <label className={fieldLabel}>
          {dict.educationTitle} <span className="normal-case font-normal text-zinc-400">· {dict.linesHint}</span>
        </label>
        <textarea
          rows={6}
          value={c.education.join('\n')}
          onChange={(e) => cvWizard.setField('education', e.target.value.split('\n'))}
          className={`${inputBase} resize-y`}
        />
      </div>
    );
  }

  if (step === 'skills') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel}>
            {dict.skillsTitle} <span className="normal-case font-normal text-zinc-400">· {dict.linesHint}</span>
          </label>
          <textarea
            rows={7}
            value={c.skills.join('\n')}
            onChange={(e) => cvWizard.setField('skills', e.target.value.split('\n'))}
            className={`${inputBase} resize-y`}
          />
        </div>
        <div>
          <label className={fieldLabel}>
            {dict.languagesTitle} <span className="normal-case font-normal text-zinc-400">· {dict.linesHint}</span>
          </label>
          <textarea
            rows={7}
            value={c.languages.join('\n')}
            onChange={(e) => cvWizard.setField('languages', e.target.value.split('\n'))}
            className={`${inputBase} resize-y`}
          />
        </div>
      </div>
    );
  }

  // review
  const suggestions = c.actionable_suggestions?.length ? c.actionable_suggestions : c.tips;
  return (
    <div className="space-y-5">
      <FolderPicker
        dict={dict}
        folders={folders}
        folderId={folderId}
        onAssign={onAssignFolder}
        onCreate={onCreateFolder}
      />
      {c.missing_requirements.length === 0 && suggestions.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.wizard.reviewClear}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {c.missing_requirements.length > 0 && (
            <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">
                <ListChecks className="w-4 h-4" /> {dict.missingTitle}
              </p>
              <ul className="space-y-1.5">
                {c.missing_requirements.map((m, i) => (
                  <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-300">• {m}</li>
                ))}
              </ul>
            </div>
          )}
          {suggestions.length > 0 && (
            <div className="rounded-2xl bg-violet-500/5 border border-violet-500/20 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-violet-600 dark:text-violet-400 mb-3">
                <Lightbulb className="w-4 h-4" /> {dict.tipsTitle}
              </p>
              <ul className="space-y-1.5">
                {suggestions.map((t, i) => (
                  <li key={i} className="text-[13px] text-zinc-600 dark:text-zinc-300">• {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <button
        onClick={onApply}
        disabled={!canSend}
        title={canSend ? dict.wizard.sendApplication : dict.wizard.incompleteTitle}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.01] transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        <Send className="w-4 h-4" /> {dict.wizard.sendApplication}
      </button>
      {!canSend && (
        <p className="text-[12px] text-red-500 text-center">{dict.wizard.incompleteTitle}</p>
      )}
    </div>
  );
}

function FolderPicker({
  dict,
  folders,
  folderId,
  onAssign,
  onCreate,
}: {
  dict: CVDict;
  folders: SentraCVFolder[];
  folderId: string | null;
  onAssign: (id: string | null) => void;
  onCreate: (name: string) => void;
}) {
  const wd = dict.wizard;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  function submit() {
    if (!name.trim()) return;
    onCreate(name);
    setName('');
    setCreating(false);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5">
      <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5">
        <Folder className="w-3.5 h-3.5" /> {wd.folderLabel}
      </label>
      {creating ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') { setCreating(false); setName(''); }
            }}
            placeholder={wd.folderPlaceholder}
            className={inputBase}
          />
          <button
            type="button"
            onClick={submit}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-green-500 text-black text-[13px] font-bold"
          >
            <Check className="w-4 h-4" /> {wd.folderCreate}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setName(''); }}
            className="shrink-0 text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-2"
            aria-label="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={folderId ?? ''}
            onChange={(e) => onAssign(e.target.value || null)}
            className={`${inputBase} appearance-none cursor-pointer`}
          >
            <option value="">{wd.folderNone}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:bg-green-500/5"
          >
            <FolderPlus className="w-4 h-4" /> {wd.folderNew}
          </button>
        </div>
      )}
    </div>
  );
}

// Vista previa A4 — espeja el layout del PDF (lib/sentra/cvPdf.ts). Siempre en
// "modo papel" (fondo blanco, texto oscuro) aunque la UI esté en dark.
function CVPreviewA4({
  content,
  labels,
  empty,
}: {
  content: CVContent;
  labels: CVDict['pdf'];
  empty: string;
}) {
  const c = content;
  const skills = c.skills.filter((s) => s.trim());
  const languages = c.languages.filter((s) => s.trim());
  const education = c.education.filter((s) => s.trim());
  const experience = c.experience.filter((e) => e.role.trim() || e.company.trim() || e.highlights.some((h) => h.trim()));
  const isEmpty = !c.full_name.trim() && !c.summary.trim() && experience.length === 0 && skills.length === 0;

  // Fila de contacto: ubicación · correo · teléfono · web, con "|" condicionales.
  // Correo y web como <a> para que los ATS extraigan los hipervínculos nativos.
  const ct = c.contact ?? { location: '', email: '', phone: '', website: '' };
  const web = ct.website.trim();
  const webHref = web ? (/^https?:\/\//i.test(web) ? web : `https://${web}`) : '';
  const contactParts = [
    ct.location.trim() ? { text: ct.location.trim() } : null,
    ct.email.trim() ? { text: ct.email.trim(), href: `mailto:${ct.email.trim()}` } : null,
    ct.phone.trim() ? { text: ct.phone.trim() } : null,
    web ? { text: web, href: webHref, blank: true } : null,
  ].filter(Boolean) as { text: string; href?: string; blank?: boolean }[];

  const Section = ({ children }: { children: React.ReactNode }) => (
    <h4 className="text-[10px] font-bold uppercase tracking-[0.08em] text-green-700 border-b-2 border-zinc-200 pb-1.5 mt-5 mb-2">
      {children}
    </h4>
  );
  const chip = (s: string, i: number) => (
    <span
      key={i}
      className="inline-block bg-green-50 border border-green-200 text-green-800 text-[10px] px-2.5 py-0.5 rounded-full mr-1.5 mb-1.5"
    >
      {s}
    </span>
  );

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-lg overflow-hidden bg-white">
      {/* Scroll VISIBLE (cv-scroll anula el hide global) y acotado a la altura de
          la ventana: el contenido largo (habilidades, idiomas) ya no se corta —
          se desplaza. min-h mantiene proporción de hoja cuando el CV es corto. */}
      <div className="cv-scroll overflow-y-auto max-h-[calc(100vh-9rem)] min-h-[420px]">
        <div
          className="p-8 sm:p-10 text-zinc-900"
          style={{ fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif' }}
        >
          {isEmpty ? (
            <p className="text-[12px] text-zinc-400 py-10 text-center">{empty}</p>
          ) : (
            <>
              <h3 className="text-[22px] font-black tracking-tight leading-tight text-zinc-900">
                {c.full_name || '—'}
              </h3>
              {c.headline && <p className="text-[12px] font-semibold text-green-600 mt-0.5">{c.headline}</p>}

              {contactParts.length > 0 && (
                <p className="text-[10px] text-zinc-600 mt-1.5 leading-relaxed">
                  {contactParts.map((p, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-zinc-300 mx-1.5">|</span>}
                      {p.href ? (
                        <a
                          href={p.href}
                          {...(p.blank ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          className="text-zinc-600 no-underline hover:underline"
                        >
                          {p.text}
                        </a>
                      ) : (
                        p.text
                      )}
                    </span>
                  ))}
                </p>
              )}

              {c.summary.trim() && (
                <>
                  <Section>{labels.summary}</Section>
                  <p className="text-[11px] leading-relaxed text-zinc-700">{c.summary}</p>
                </>
              )}

              {experience.length > 0 && (
                <>
                  <Section>{labels.experience}</Section>
                  {experience.map((e, i) => (
                    <div key={i} className="mb-2.5">
                      <div className="flex justify-between items-baseline gap-2">
                        <p className="text-[11.5px] font-semibold text-zinc-900">
                          {e.role}
                          {e.company && <span className="font-normal text-zinc-600"> · {e.company}</span>}
                        </p>
                        {e.period && <span className="text-[10px] text-zinc-500 shrink-0">{e.period}</span>}
                      </div>
                      {e.highlights.filter((h) => h.trim()).length > 0 && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {e.highlights
                            .filter((h) => h.trim())
                            .map((h, j) => (
                              <li key={j} className="text-[10.5px] text-zinc-700 leading-snug">
                                {h}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </>
              )}

              {education.length > 0 && (
                <>
                  <Section>{labels.education}</Section>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {education.map((s, i) => (
                      <li key={i} className="text-[10.5px] text-zinc-700 leading-snug">
                        {s}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {skills.length > 0 && (
                <>
                  <Section>{labels.skills}</Section>
                  <div>{skills.map(chip)}</div>
                </>
              )}

              {languages.length > 0 && (
                <>
                  <Section>{labels.languages}</Section>
                  <div>{languages.map(chip)}</div>
                </>
              )}

              <div className="mt-6 pt-2.5 border-t border-zinc-200 text-[9px] text-zinc-400">
                {labels.generatedBy} — cescjavier.dev
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
