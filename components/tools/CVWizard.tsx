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
  Wand2, Download, Send, Plus, Trash2, ArrowLeft, ArrowRight, Mail, X, ChevronDown,
  Check, Lock, Loader2, ListChecks, Lightbulb, Cloud, Folder, FolderPlus, ExternalLink, AlertCircle,
  FileText, Copy, Gauge, MessageSquare, TrendingUp,
} from 'lucide-react';
import {
  sentraUpdateCV, sentraImproveCV, sentraApplyEmail, sentraCoverLetter, sentraInterviewPrep, sentraCVQuota,
  sentraListCVFolders, sentraCreateCVFolder, SentraApiError,
  type SentraCVDocument, type SentraApplyEmail, type SentraInterviewPrep, type SentraCVQuota, type CVContent,
  type SentraCVFolder,
} from '@/lib/sentra/api';
import { openCVPdf, openCoverLetterPdf } from '@/lib/sentra/cvPdf';
import { atsCoverage, cvQualityChecks, estimateCVFit, type QualityCheck } from '@/lib/sentra/cvQuality';
import { useSentraSession } from '@/lib/sentra/useSession';
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
  // Marca de agua del PDF SOLO para Freemium: los planes de pago exportan limpio.
  const { user } = useSentraSession();
  const isPaid = user?.plan === 'PRO' || user?.plan === 'TEAM' || user?.plan === 'ENTERPRISE';

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
    openCVPdf(clean, dict.pdf, { hideWatermark: isPaid });
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
            disabled={improving || aiLocked || content.match_score >= 100}
            title={
              content.match_score >= 100 ? wd.perfectMatch : aiLocked ? wd.aiLocked : wd.magicHint
            }
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-violet-600 text-white text-[13px] font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {content.match_score >= 100 ? (
              <Check className="w-4 h-4" />
            ) : aiLocked ? (
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

      {content.match_score >= 100 && (
        <div className="flex items-center gap-2 text-[13px] font-semibold text-green-700 dark:text-green-400 bg-green-500/10 border border-green-500/25 rounded-2xl px-4 py-3">
          <Check className="w-4 h-4 shrink-0" />
          <span>{wd.perfectMatch}</span>
        </div>
      )}
      {aiLocked && content.match_score < 100 && (
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
              cvId={cvId}
              cv={cv}
              folders={folders}
              folderId={folderId}
              onAssignFolder={assignFolder}
              onCreateFolder={createAndAssignFolder}
              errors={validation.errors}
              canSend={validation.ok}
              lang={lang}
              isPaid={isPaid}
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
            {/* En el último paso la acción de envío vive en el cuerpo (Split
                Button), así el dropdown tiene espacio para abrir hacia arriba. */}
            {!isLast && (
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
          <CVPreviewA4 content={content} labels={dict.pdf} empty={wd.previewEmpty} hideWatermark={isPaid} />
        </div>
      </div>

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
  cvId,
  cv,
  folders,
  folderId,
  onAssignFolder,
  onCreateFolder,
  errors,
  canSend,
  lang,
  isPaid,
}: {
  step: CVStep;
  content: CVContent;
  dict: CVDict;
  cvId: string | null;
  cv: SentraCVDocument;
  folders: SentraCVFolder[];
  folderId: string | null;
  onAssignFolder: (id: string | null) => void;
  onCreateFolder: (name: string) => void;
  errors: CVFieldErrors;
  canSend: boolean;
  lang: string;
  isPaid: boolean;
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
    const edu = c.education ?? [];
    const certs = c.certifications ?? [];
    return (
      <div className="space-y-5">
        {/* Formación — field array: Título · Institución · Período */}
        <div>
          <label className={fieldLabel}>{dict.educationTitle}</label>
          <div className="space-y-2.5">
            {edu.map((e, i) => (
              <div key={i} className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <button type="button" onClick={() => cvWizard.removeEducation(i)} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500" aria-label="Quitar">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_7rem] gap-2.5 pr-8">
                  <input placeholder={dict.wizard.eduDegree} value={e.degree} onChange={(ev) => cvWizard.setEducation(i, { degree: ev.target.value })} className={inputBase} />
                  <input placeholder={dict.wizard.eduInstitution} value={e.institution} onChange={(ev) => cvWizard.setEducation(i, { institution: ev.target.value })} className={inputBase} />
                  <input placeholder={dict.wizard.eduPeriod} value={e.period} onChange={(ev) => cvWizard.setEducation(i, { period: ev.target.value })} className={inputBase} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => cvWizard.addEducation()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline">
              <Plus className="w-3.5 h-3.5" /> {dict.wizard.eduAdd}
            </button>
          </div>
        </div>

        {/* Certificaciones — field array: Nombre · Entidad · Año */}
        <div>
          <label className={fieldLabel}>{dict.wizard.certTitle}</label>
          <div className="space-y-2.5">
            {certs.map((cert, i) => (
              <div key={i} className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <button type="button" onClick={() => cvWizard.removeCertification(i)} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500" aria-label="Quitar">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_5.5rem] gap-2.5 pr-8">
                  <input placeholder={dict.wizard.certName} value={cert.name} onChange={(e) => cvWizard.setCertification(i, { name: e.target.value })} className={inputBase} />
                  <input placeholder={dict.wizard.certIssuer} value={cert.issuer} onChange={(e) => cvWizard.setCertification(i, { issuer: e.target.value })} className={inputBase} />
                  <input placeholder={dict.wizard.certYear} value={cert.year} onChange={(e) => cvWizard.setCertification(i, { year: e.target.value })} className={inputBase} inputMode="numeric" />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => cvWizard.addCertification()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline">
              <Plus className="w-3.5 h-3.5" /> {dict.wizard.certAdd}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'skills') {
    const groups = c.skills ?? [];
    const langs = c.languages ?? [];
    return (
      <div className="space-y-5">
        {/* Habilidades AGRUPADAS por categoría (Categoría + ítems, uno por línea) */}
        <div>
          <label className={fieldLabel}>{dict.skillsTitle}</label>
          <div className="space-y-2.5">
            {groups.map((g, i) => (
              <div key={i} className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5">
                <button type="button" onClick={() => cvWizard.removeSkillGroup(i)} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500" aria-label="Quitar">
                  <Trash2 className="w-4 h-4" />
                </button>
                <input placeholder={dict.wizard.skillCategory} value={g.category} onChange={(e) => cvWizard.setSkillGroup(i, { category: e.target.value })} className={`${inputBase} pr-8 font-semibold`} />
                <textarea placeholder={dict.wizard.skillItems} rows={2} value={g.items.join('\n')} onChange={(e) => cvWizard.setSkillGroup(i, { items: e.target.value.split('\n') })} className={`${inputBase} resize-y`} />
              </div>
            ))}
            <button type="button" onClick={() => cvWizard.addSkillGroup()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline">
              <Plus className="w-3.5 h-3.5" /> {dict.wizard.skillAddGroup}
            </button>
          </div>
        </div>

        {/* Idiomas — field array: Idioma · Nivel */}
        <div>
          <label className={fieldLabel}>{dict.languagesTitle}</label>
          <div className="space-y-2.5">
            {langs.map((l, i) => (
              <div key={i} className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <button type="button" onClick={() => cvWizard.removeLanguage(i)} className="absolute top-3 right-3 text-zinc-400 hover:text-red-500" aria-label="Quitar">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-8">
                  <input placeholder={dict.wizard.langName} value={l.language} onChange={(e) => cvWizard.setLanguage(i, { language: e.target.value })} className={inputBase} />
                  <input placeholder={dict.wizard.langLevel} value={l.level} onChange={(e) => cvWizard.setLanguage(i, { level: e.target.value })} className={inputBase} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => cvWizard.addLanguage()} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline">
              <Plus className="w-3.5 h-3.5" /> {dict.wizard.langAdd}
            </button>
          </div>
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
      {/* Panel de cobertura ATS + calidad, lado a lado en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ATSCoveragePanel content={content} lang={lang} missingTitle={dict.missingTitle} />
        <CVQualityPanel content={content} lang={lang} />
      </div>

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
      <ApplyEmailButton cvId={cvId} cv={cv} content={content} dict={dict} lang={lang} isPaid={isPaid} disabled={!canSend} />
      <CoverLetterButton cvId={cvId} cv={cv} content={content} lang={lang} disabled={!canSend} />
      <InterviewPrepButton cvId={cvId} cv={cv} lang={lang} disabled={!canSend} />
      {!canSend && (
        <p className="text-[12px] text-red-500 text-center">{dict.wizard.incompleteTitle}</p>
      )}
    </div>
  );
}

// Carta de presentación: se genera BAJO DEMANDA (no al montar, para no gastar una
// llamada de IA si el usuario no la pide). Panel editable + copiar + PDF.
function CoverLetterButton({
  cvId,
  cv,
  content,
  lang,
  disabled,
}: {
  cvId: string | null;
  cv: SentraCVDocument;
  content: CVContent;
  lang: string;
  disabled: boolean;
}) {
  const en = lang === 'en';
  const L = {
    btn: en ? 'Cover letter' : 'Carta de presentación',
    generating: en ? 'Writing…' : 'Redactando…',
    hint: en
      ? 'Formal one-page letter, grounded in your CV. Review and edit before using.'
      : 'Carta formal de una página, anclada a tu CV. Revísala y edítala antes de usarla.',
    copy: en ? 'Copy' : 'Copiar',
    copied: en ? 'Copied' : 'Copiado',
    pdf: en ? 'Download PDF' : 'Descargar PDF',
    err: en ? 'Could not generate the letter. Try again.' : 'No se pudo generar la carta. Inténtalo de nuevo.',
  };
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (text === null && !loading) {
      setLoading(true);
      setError(false);
      try {
        const r = await sentraCoverLetter(cvId ?? cv.id);
        setText(r.body);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* portapapeles bloqueado */
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
      <button
        onClick={toggle}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-5 py-3.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="inline-flex items-center gap-2">
          <FileText className="w-4 h-4 text-green-500" /> {L.btn}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5">
          {loading ? (
            <p className="flex items-center gap-2 text-[13px] text-zinc-500 dark:text-zinc-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-green-500" /> {L.generating}
            </p>
          ) : error ? (
            <div className="flex items-center justify-between gap-3 py-3">
              <p className="text-[13px] text-red-500">{L.err}</p>
              <button onClick={toggle} className="text-[12px] font-semibold text-green-600 dark:text-green-400 hover:underline">↻</button>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-2">{L.hint}</p>
              <textarea
                value={text ?? ''}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-[13px] leading-relaxed text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40 resize-y"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? L.copied : L.copy}
                </button>
                <button
                  onClick={() => openCoverLetterPdf(content, text ?? '')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-500 text-black text-[13px] font-bold hover:brightness-105 active:scale-[0.98] transition"
                >
                  <Download className="w-4 h-4" /> {L.pdf}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Panel de cobertura ATS: match score + requisitos por cubrir, con RE-CHEQUEO en
// vivo (si el usuario ya añadió el requisito al editar, se marca como cubierto).
function ATSCoveragePanel({ content, lang, missingTitle }: { content: CVContent; lang: string; missingTitle: string }) {
  const en = lang === 'en';
  const items = atsCoverage(content);
  const score = content.match_score;
  const L = {
    title: en ? 'ATS coverage' : 'Cobertura ATS',
    match: 'Match',
    allClear: en ? 'Your CV covers the offer requirements well.' : 'Tu CV cubre bien los requisitos de la oferta.',
    coveredNote: en ? 'now covered' : 'ya cubierto',
    hint: en ? 'Add these only if you truly have them — never invent.' : 'Añádelos solo si de verdad los tienes — nunca inventes.',
  };
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
          <Gauge className="w-4 h-4 text-green-500" /> {L.title}
        </p>
        <div>
          <span className="text-2xl font-black tabular-nums" style={{ color: matchColor(score) }}>{score}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 ml-1">{L.match}</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-4">
        <div className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, score))}%`, backgroundColor: matchColor(score) }} />
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{L.allClear}</p>
      ) : (
        <>
          <p className="text-[12px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
            <ListChecks className="w-3.5 h-3.5" /> {missingTitle}
          </p>
          <ul className="space-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="text-[13px] flex items-start gap-2">
                {it.covered ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-zinc-400 line-through">{it.requirement}</span>
                    <span className="text-[11px] text-green-600 dark:text-green-400 shrink-0">· {L.coveredNote}</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-300">{it.requirement}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-zinc-400 mt-3">{L.hint}</p>
        </>
      )}
    </div>
  );
}

// Chequeos de calidad DETERMINISTAS del CV (sin IA). Cada uno traduce code+value.
function CVQualityPanel({ content, lang }: { content: CVContent; lang: string }) {
  const en = lang === 'en';
  const checks = cvQualityChecks(content);
  const fit = estimateCVFit(content);
  const fitLabel = fit.pages <= 1
    ? en ? 'Fits on one page' : 'Cabe en una página'
    : en ? `Likely ${fit.pages} pages — consider trimming` : `Probablemente ${fit.pages} páginas — considera recortar`;
  const label = (c: QualityCheck): string => {
    const v = c.value;
    if (en)
      return {
        metrics: `Impact metrics in bullets: ${v}%`,
        summary: v < 200 ? 'Summary is a bit short' : v > 700 ? 'Summary is too long' : 'Summary length is on point',
        bullets: `${v} achievement bullet(s)`,
        weakverbs: v === 0 ? 'Strong action verbs' : `${v} weak/passive bullet start(s)`,
        skills: `${v} skills listed`,
        contact: v ? 'Contact email present' : 'Missing contact email',
      }[c.code];
    return {
      metrics: `Logros con métricas: ${v}%`,
      summary: v < 200 ? 'El resumen es algo corto' : v > 700 ? 'El resumen es muy largo' : 'Largo del resumen adecuado',
      bullets: `${v} logro(s) en experiencia`,
      weakverbs: v === 0 ? 'Verbos de acción fuertes' : `${v} bullet(s) con arranque débil`,
      skills: `${v} habilidades listadas`,
      contact: v ? 'Correo de contacto presente' : 'Falta el correo de contacto',
    }[c.code];
  };
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-3">
        <TrendingUp className="w-4 h-4 text-green-500" /> {en ? 'CV quality' : 'Calidad del CV'}
      </p>
      <ul className="space-y-1.5">
        <li className="text-[13px] flex items-start gap-2">
          {fit.level === 'good' ? (
            <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
          )}
          <span className={fit.level === 'good' ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-700 dark:text-zinc-200'}>{fitLabel}</span>
        </li>
        {checks.map((c) => (
          <li key={c.code} className="text-[13px] flex items-start gap-2">
            {c.level === 'good' ? (
              <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
            )}
            <span className={c.level === 'good' ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-700 dark:text-zinc-200'}>{label(c)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Preparación de entrevista: preguntas probables + tips anclados al CV. Se genera
// BAJO DEMANDA (no al montar), como la carta de presentación.
function InterviewPrepButton({ cvId, cv, lang, disabled }: { cvId: string | null; cv: SentraCVDocument; lang: string; disabled: boolean }) {
  const en = lang === 'en';
  const L = {
    btn: en ? 'Interview prep' : 'Prepárate para la entrevista',
    generating: en ? 'Preparing…' : 'Preparando…',
    hint: en ? 'Likely questions and how to answer using your real experience.' : 'Preguntas probables y cómo responderlas usando tu experiencia real.',
    err: en ? 'Could not generate. Try again.' : 'No se pudo generar. Inténtalo de nuevo.',
  };
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState<SentraInterviewPrep | null>(null);
  const [error, setError] = useState(false);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (prep === null && !loading) {
      setLoading(true);
      setError(false);
      try {
        setPrep(await sentraInterviewPrep(cvId ?? cv.id));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40">
      <button
        onClick={toggle}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 px-5 py-3.5 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="inline-flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-green-500" /> {L.btn}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5">
          {loading ? (
            <p className="flex items-center gap-2 text-[13px] text-zinc-500 dark:text-zinc-400 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-green-500" /> {L.generating}
            </p>
          ) : error ? (
            <div className="flex items-center justify-between gap-3 py-3">
              <p className="text-[13px] text-red-500">{L.err}</p>
              <button onClick={toggle} className="text-[12px] font-semibold text-green-600 dark:text-green-400 hover:underline">↻</button>
            </div>
          ) : (
            <>
              <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-3">{L.hint}</p>
              <ol className="space-y-3">
                {(prep?.questions ?? []).map((q, i) => (
                  <li key={i} className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-3.5">
                    <p className="text-[13px] font-bold text-zinc-800 dark:text-zinc-100 flex gap-2">
                      <span className="text-green-500">{i + 1}.</span> {q.question}
                    </p>
                    {q.tip && <p className="text-[12.5px] text-zinc-600 dark:text-zinc-400 mt-1.5 pl-5">💡 {q.tip}</p>}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Split Button de envío. Reemplaza el modal: al pulsar, descarga el PDF y abre
// Gmail (o el correo local) con asunto/cuerpo ya rellenados. El correo se
// PRE-GENERA al montar (IA), de modo que el clic no hace await → sin bloqueo de
// pop-ups del navegador. Con fallback si la IA no responde.
function ApplyEmailButton({
  cvId,
  cv,
  content,
  dict,
  lang,
  isPaid,
  disabled,
}: {
  cvId: string | null;
  cv: SentraCVDocument;
  content: CVContent;
  dict: CVDict;
  lang: string;
  isPaid: boolean;
  disabled: boolean;
}) {
  const wd = dict.wizard;
  const [email, setEmail] = useState<SentraApplyEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    sentraApplyEmail(cvId ?? cv.id)
      .then((e) => alive && setEmail(e))
      .catch(() => alive && setEmail(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cvId, cv.id]);

  // Fallback si la IA no respondió: correo formal (con saludo) armado desde el
  // CV — nunca dejamos al usuario sin poder enviar ni con un correo sin saludo.
  const en = lang === 'en';
  const fallbackBody = [
    en ? 'Dear Hiring Team,' : 'Estimados,',
    '',
    (en ? 'I am writing to apply for the ' : 'Me dirijo a ustedes para postular al puesto de ') +
      (content.headline || (en ? 'position' : 'la vacante')) + (en ? ' position.' : '.'),
    '',
    content.summary || '',
    '',
    en ? 'I look forward to your reply. Best regards,' : 'Quedo atento a su respuesta. Un cordial saludo,',
    content.full_name || '',
  ].join('\n').trim();

  const subject = (email?.subject || `${en ? 'Application' : 'Postulación'} — ${content.headline || content.full_name}`).trim();
  const body = email?.body || fallbackBody;
  // Destinatario: el que extrajo la IA; si no, lo buscamos en la oferta (regex).
  const to = email?.recipient || (cv.job_posting.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] ?? '');

  // Descarga el PDF (ventana de impresión → PDF real) SIN await previo, para que
  // la apertura del correo ocurra dentro del gesto del usuario (sin bloqueo).
  function send(via: 'gmail' | 'mail') {
    setOpen(false);
    openCVPdf(cleanCVContent(content), dict.pdf, { hideWatermark: isPaid });
    if (via === 'gmail') {
      const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
        to,
      )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  }

  const busy = disabled || loading;

  return (
    <div className="relative">
      <div className="flex">
        <button
          onClick={() => send('gmail')}
          disabled={busy}
          title={disabled ? wd.incompleteTitle : wd.sendGmail}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-l-full bg-green-500 text-black text-sm font-bold hover:brightness-105 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {wd.sendGmail}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={busy}
          aria-label={wd.sendMore}
          className="inline-flex items-center justify-center px-3 py-3 rounded-r-full bg-green-500 text-black border-l border-black/15 hover:brightness-105 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500 text-center leading-snug">
        {dict.applyInstruction}
      </p>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          {/* Abre HACIA ARRIBA (bottom-full): el botón vive al pie del wizard. */}
          <div className="absolute right-0 bottom-full mb-2 z-40 w-60 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1.5 overflow-hidden">
            <button
              onClick={() => send('gmail')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5"
            >
              <ExternalLink className="w-4 h-4 text-red-500" /> {wd.sendGmail}
            </button>
            <button
              onClick={() => send('mail')}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-left text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5"
            >
              <Mail className="w-4 h-4" /> {wd.sendMailLocal}
            </button>
          </div>
        </>
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
// Dimensiones A4 @96dpi y márgenes de impresión (16mm × 15mm) del PDF real
// (ver lib/sentra/cvPdf.ts → @media print). El visor renderiza a ESTE ancho fijo
// con los MISMOS px que el PDF y luego se escala para caber en el panel: así el
// usuario ve exactamente las proporciones, tamaños y saltos de línea del PDF.
const A4_W = 794;
const A4_H = 1123;
const A4_PAD_X = 57; // 15mm
const A4_PAD_Y = 60; // 16mm

function CVPreviewA4({
  content,
  labels,
  empty,
  hideWatermark,
}: {
  content: CVContent;
  labels: CVDict['pdf'];
  empty: string;
  hideWatermark?: boolean;
}) {
  const c = content;
  const skills = (c.skills ?? [])
    .map((g) => ({ ...g, items: g.items.filter((i) => i.trim()) }))
    .filter((g) => g.items.length > 0 || g.category.trim());
  const languages = (c.languages ?? []).filter((l) => l.language.trim());
  const education = (c.education ?? []).filter((e) => e.degree.trim() || e.institution.trim());
  const certifications = (c.certifications ?? []).filter((cert) => cert.name.trim());
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

  // ── Escalado responsivo: medimos el ancho disponible y escalamos la hoja de
  //    794px para que quepa. La altura reservada = altura natural × escala.
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pageH, setPageH] = useState(A4_H);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => {
      const w = stage.clientWidth;
      if (w > 0) setScale(w / A4_W);
    });
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  // Remedimos la altura natural (a 794px, sin escalar) cada vez que cambia el
  // contenido: así reservamos el alto correcto y dibujamos los saltos de hoja.
  useEffect(() => {
    const page = pageRef.current;
    if (page) setPageH(Math.max(page.scrollHeight, A4_H));
  }, [content]);

  // Guías de "salto de hoja" A4: líneas punteadas donde cortará cada página.
  const pageBreaks = Math.max(0, Math.ceil(pageH / A4_H) - 1);

  // Estilo Harvard (idéntico al PDF): encabezado de sección en mayúsculas gris
  // con línea fina inferior. Estilos EN PX para calcar cvPdf.ts al milímetro.
  const Section = ({ children }: { children: React.ReactNode }) => (
    <h2
      style={{
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#374151',
        borderBottom: '1px solid #d1d5db',
        paddingBottom: 5,
        margin: '24px 0 10px',
        fontWeight: 600,
      }}
    >
      {children}
    </h2>
  );

  return (
    <div className="rounded-xl border border-gray-200 dark:border-zinc-700 shadow-lg overflow-hidden bg-zinc-200/70 dark:bg-zinc-800/60">
      {/* overflow acotado a la ventana + cv-scroll (barra visible). El contenido
          nunca rompe el layout del split-screen. Padding para "aire" alrededor
          de la hoja, como en un visor de PDF. */}
      <div className="cv-scroll overflow-y-auto overflow-x-hidden max-h-[calc(100vh-9rem)] min-h-[420px] p-3 sm:p-4">
        {/* stage: ocupa el ancho disponible y reserva la altura de la hoja escalada. */}
        <div ref={stageRef} className="w-full mx-auto" style={{ height: pageH * scale }}>
          <div
            ref={pageRef}
            className="bg-white text-gray-900 shadow-xl relative origin-top-left"
            style={{
              width: A4_W,
              minHeight: A4_H,
              padding: `${A4_PAD_Y}px ${A4_PAD_X}px`,
              transform: `scale(${scale})`,
              fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
              lineHeight: 1.5,
              color: '#111827',
              overflowWrap: 'break-word',
            }}
          >
            {isEmpty ? (
              <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '80px 0' }}>{empty}</p>
            ) : (
              <>
                <h1 style={{ fontSize: 28, margin: '0 0 2px', letterSpacing: '-0.02em', color: '#111827', fontWeight: 700 }}>
                  {c.full_name || '—'}
                </h1>
                {c.headline && (
                  <p style={{ fontSize: 14, color: '#4b5563', fontWeight: 500, margin: '0 0 4px' }}>{c.headline}</p>
                )}

                {contactParts.length > 0 && (
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 18px' }}>
                    {contactParts.map((p, i) => (
                      <span key={i}>
                        {i > 0 && <span style={{ color: '#d1d5db', margin: '0 6px' }}>|</span>}
                        {p.href ? (
                          <a
                            href={p.href}
                            {...(p.blank ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                            style={{ color: '#6b7280', textDecoration: 'none' }}
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
                    <p style={{ fontSize: 13.5, color: '#1f2937', whiteSpace: 'pre-wrap', margin: 0 }}>{c.summary}</p>
                  </>
                )}

                {experience.length > 0 && (
                  <>
                    <Section>{labels.experience}</Section>
                    {experience.map((e, i) => (
                      <div key={i} style={{ marginBottom: 13 }}>
                        <div style={{ fontSize: 14, overflow: 'hidden' }}>
                          <strong style={{ color: '#111827' }}>{e.role}</strong>
                          {e.company && <span> · {e.company}</span>}
                          {e.period && (
                            <span style={{ float: 'right', color: '#6b7280', fontSize: 12, fontWeight: 500 }}>{e.period}</span>
                          )}
                        </div>
                        {e.highlights.filter((h) => h.trim()).length > 0 && (
                          <ul style={{ margin: '5px 0 0', paddingLeft: 18 }}>
                            {e.highlights
                              .filter((h) => h.trim())
                              .map((h, j) => (
                                <li key={j} style={{ fontSize: 13, color: '#1f2937', marginBottom: 3 }}>
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
                    <ul style={{ margin: '5px 0 0', paddingLeft: 18 }}>
                      {education.map((e, i) => (
                        <li key={i} style={{ fontSize: 13, color: '#1f2937', marginBottom: 3 }}>
                          {e.degree}
                          {e.institution && <span> — {e.institution}</span>}
                          {e.period && <span> ({e.period})</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {certifications.length > 0 && (
                  <>
                    <Section>{labels.certifications}</Section>
                    <ul style={{ margin: '5px 0 0', paddingLeft: 18 }}>
                      {certifications.map((cert, i) => (
                        <li key={i} style={{ fontSize: 13, color: '#1f2937', marginBottom: 3 }}>
                          {cert.name}
                          {cert.issuer && <span> — {cert.issuer}</span>}
                          {cert.year && <span> ({cert.year})</span>}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {skills.length > 0 && (
                  <>
                    <Section>{labels.skills}</Section>
                    {skills.map((g, i) => (
                      <p key={i} style={{ fontSize: 13, color: '#1f2937', margin: '0 0 2px' }}>
                        {g.category && <strong>{g.category}: </strong>}
                        {g.items.join('  ·  ')}
                      </p>
                    ))}
                  </>
                )}

                {languages.length > 0 && (
                  <>
                    <Section>{labels.languages}</Section>
                    <p style={{ fontSize: 13, color: '#1f2937', margin: 0 }}>
                      {languages.map((l) => (l.level ? `${l.language} (${l.level})` : l.language)).join('  ·  ')}
                    </p>
                  </>
                )}

                {!hideWatermark && (
                  <div style={{ marginTop: 32, paddingTop: 12, borderTop: '1px solid #e5e7eb', fontSize: 10, color: '#9ca3af' }}>
                    {labels.generatedBy} — cescjavier.dev
                  </div>
                )}
              </>
            )}

            {/* Guías de salto de hoja A4 (no imprimibles): muestran dónde corta
                cada página. Escalan junto con la hoja. */}
            {Array.from({ length: pageBreaks }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: (i + 1) * A4_H,
                  borderTop: '2px dashed #cbd5e1',
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: -22,
                    fontSize: 11,
                    color: '#94a3b8',
                    background: '#fff',
                    padding: '0 6px',
                  }}
                >
                  {i + 2}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
