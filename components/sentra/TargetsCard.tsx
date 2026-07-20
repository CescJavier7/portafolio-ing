'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Globe, Plus, ShieldCheck, ShieldAlert, Trash2, Copy, Check, X, Radar, Lock, ChevronDown, Sparkles, FileText, Briefcase, Download, ListChecks,
} from 'lucide-react';
import type React from 'react';
import {
  sentraCreateTarget,
  sentraDeleteTarget,
  sentraGenerateReport,
  sentraGetInstructions,
  sentraListScans,
  sentraListTargets,
  sentraScanTarget,
  sentraVerifyTarget,
  SentraApiError,
  type SentraReport,
  type SentraScan,
  type SentraTarget,
  type SentraTargetCreated,
} from '@/lib/sentra/api';
import UpgradeModal, { type UpgradeDict } from '@/components/sentra/UpgradeModal';
import ScoreTrend from '@/components/sentra/ScoreTrend';
import { openScanReport, type PdfLabels } from '@/lib/sentra/pdfReport';

interface SeverityDict {
  alta: string;
  media: string;
  baja: string;
}

interface ScanDict {
  scan: string;
  scanning: string;
  rescan: string;
  scoreLabel: string;
  lastScan: string;
  noScans: string;
  detailTitle: string;
  passed: string;
  failed: string;
  recommendation: string;
  lockedTitle: string;
  lockedBody: string;
  lockedCta: string;
  scansLeft: string;
  verifyFirst: string;
  severity: SeverityDict;
  reportBtn: string;
  reportGenerating: string;
  reportTechnical: string;
  reportExecutive: string;
  reportPriorities: string;
  reportError: string;
  reportRegenerate: string;
  trendTitle: string;
  trendEmpty: string;
  pdfBtn: string;
  pdfGenerating: string;
  pdf: PdfLabels;
}

export interface TargetsDict {
  title: string;
  desc: string;
  addPlaceholder: string;
  add: string;
  adding: string;
  empty: string;
  verified: string;
  pending: string;
  verify: string;
  verifying: string;
  delete: string;
  instructionsTitle: string;
  instructionsIntro: string;
  recordType: string;
  recordName: string;
  recordValue: string;
  copy: string;
  copied: string;
  close: string;
  scanSoon: string;
  guideTitle: string;
  guideSteps: string[];
  scanUI: ScanDict;
}

const inputClass =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition';

function gradeColor(grade: string): string {
  if (grade === 'A') return '#22c55e';
  if (grade === 'B') return '#84cc16';
  if (grade === 'C') return '#eab308';
  if (grade === 'D') return '#f97316';
  return '#ef4444';
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const color = gradeColor(grade);
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-zinc-200 dark:text-zinc-800" />
        <motion.circle
          cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (score / 100) * circ }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-zinc-900 dark:text-white leading-none">{score}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{grade}</span>
      </div>
    </div>
  );
}

function ReportBlock({ icon, title, md }: { icon: React.ReactNode; title: string; md: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white mb-3">
        {icon} {title}
      </p>
      <div className="prose prose-sm dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 text-[13px] leading-relaxed prose-code:text-[12px] prose-headings:text-zinc-900 dark:prose-headings:text-white prose-pre:bg-zinc-100 dark:prose-pre:bg-black/40">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </div>
    </div>
  );
}

function AiReport({ scan, dict, lang }: { scan: SentraScan; dict: ScanDict; lang: string }) {
  const [report, setReport] = useState<SentraReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!scan.findings) return;
    setBusy(true);
    setError(null);
    try {
      setReport(
        await sentraGenerateReport({
          domain: scan.domain,
          score: scan.score,
          grade: scan.grade,
          findings: scan.findings,
          lang,
        }),
      );
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : dict.reportError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      {!report && (
        <button
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-[13px] font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg shadow-amber-500/20"
        >
          <Sparkles className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
          {busy ? dict.reportGenerating : dict.reportBtn}
        </button>
      )}
      {error && <p className="mt-3 text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>}

      {report && (
        <div className="space-y-4">
          <ReportBlock icon={<Briefcase className="w-4 h-4 text-amber-500" />} title={dict.reportExecutive} md={report.executive} />
          <ReportBlock icon={<ListChecks className="w-4 h-4 text-teal-500" />} title={dict.reportPriorities} md={report.priorities} />
          <ReportBlock icon={<FileText className="w-4 h-4 text-green-500" />} title={dict.reportTechnical} md={report.technical} />
          <div className="flex flex-wrap items-center gap-4">
            {/* El PDF reutiliza el informe ya generado — sin segunda llamada a la IA. */}
            <button
              onClick={() => scan.findings && openScanReport(scan, dict.pdf, report)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-[13px] font-bold hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" /> {dict.pdfBtn}
            </button>
            <button
              onClick={generate}
              disabled={busy}
              className="inline-flex items-center gap-2 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors disabled:opacity-60"
            >
              <Sparkles className={`w-3.5 h-3.5 ${busy ? 'animate-pulse' : ''}`} />
              {busy ? dict.reportGenerating : dict.reportRegenerate}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanResultPanel({
  scan,
  history,
  dict,
  lang,
  onUpgrade,
}: {
  scan: SentraScan;
  history: SentraScan[];
  dict: ScanDict;
  lang: string;
  onUpgrade: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Historial en orden cronológico ascendente para la tendencia.
  const trend = [...history].reverse();
  return (
    <div className="mt-4 rounded-2xl bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <ScoreRing score={scan.score} grade={scan.grade} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dict.scoreLabel}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {dict.lastScan}: {new Date(scan.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Tendencia del score (aparece con ≥2 escaneos). */}
      {trend.length >= 2 && (
        <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <ScoreTrend scans={trend} title={dict.trendTitle} empty={dict.trendEmpty} />
        </div>
      )}

      {scan.detail_locked ? (
        <button
          onClick={onUpgrade}
          className="mt-4 w-full text-left rounded-xl bg-gradient-to-br from-amber-400/10 to-yellow-500/5 border border-amber-500/20 p-4 hover:border-amber-500/40 transition-colors"
        >
          <p className="flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
            <Lock className="w-4 h-4" /> {dict.lockedTitle}
          </p>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{dict.lockedBody}</p>
          <span className="inline-block mt-2 text-[13px] font-bold text-amber-600 dark:text-amber-400">{dict.lockedCta} →</span>
        </button>
      ) : scan.findings ? (
        <div className="mt-4">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center justify-between w-full text-sm font-bold text-zinc-700 dark:text-zinc-300"
          >
            {dict.detailTitle}
            <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {open && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-3 space-y-2"
              >
                {scan.findings.map((f) => (
                  <li key={f.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-zinc-800 dark:text-zinc-200">
                        {f.passed ? (
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        {f.label}
                      </span>
                      <span className={`text-[11px] font-bold ${f.passed ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                        {f.passed ? `+${f.weight}` : `0/${f.weight}`}
                      </span>
                    </div>
                    {!f.passed && f.recommendation && (
                      <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                        <span className="font-semibold">{dict.recommendation}:</span> {f.recommendation}
                      </p>
                    )}
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          <AiReport scan={scan} dict={dict} lang={lang} />
        </div>
      ) : null}
    </div>
  );
}

function CopyField({ label, value, copyLabel, copiedLabel }: { label: string; value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[13px] text-zinc-800 dark:text-zinc-200">
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </div>
  );
}

export default function TargetsCard({ dict, upgradeDict, lang }: { dict: TargetsDict; upgradeDict: UpgradeDict; lang: string }) {
  const s = dict.scanUI;
  const [targets, setTargets] = useState<SentraTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<SentraTargetCreated | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);
  // Historial completo por dominio (orden descendente que da la API): el
  // último escaneo es [0] y el array alimenta la gráfica de tendencia.
  const [scans, setScans] = useState<Record<string, SentraScan[]>>({});
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason?: string }>({ open: false });

  useEffect(() => {
    sentraListTargets()
      .then(async (list) => {
        setTargets(list);
        // Cargar el historial de cada dominio verificado (pocos, ok).
        const verified = list.filter((t) => t.verified);
        const results = await Promise.all(
          verified.map((t) =>
            sentraListScans(t.id)
              .then((sc) => [t.id, sc] as [string, SentraScan[]])
              .catch(() => [t.id, [] as SentraScan[]] as [string, SentraScan[]]),
          ),
        );
        const map: Record<string, SentraScan[]> = {};
        for (const [id, sc] of results) if (sc.length) map[id] = sc;
        setScans(map);
      })
      .catch(() => setTargets([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError(null);
    try {
      const created = await sentraCreateTarget(domain);
      setTargets((prev) => [created, ...prev]);
      setDomain('');
      setInstructions(created);
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) {
        setUpgrade({ open: true, reason: err.detail });
      } else {
        setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    setVerifyMsg(null);
    try {
      const res = await sentraVerifyTarget(id);
      setVerifyMsg({ id, ok: res.verified, text: res.detail });
      if (res.verified) {
        setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, verified: true, verified_at: new Date().toISOString() } : t)));
        setInstructions(null);
      }
    } catch (err) {
      setVerifyMsg({ id, ok: false, text: err instanceof SentraApiError ? err.detail : 'Error de conexión.' });
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleScan(id: string) {
    setScanningId(id);
    try {
      const result = await sentraScanTarget(id);
      // Prepend: el nuevo escaneo pasa a ser el más reciente del historial.
      setScans((prev) => ({ ...prev, [id]: [result, ...(prev[id] ?? [])] }));
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) {
        setUpgrade({ open: true, reason: err.detail });
      } else {
        setVerifyMsg({ id, ok: false, text: err instanceof SentraApiError ? err.detail : 'Error de conexión.' });
      }
    } finally {
      setScanningId(null);
    }
  }

  async function handleDelete(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    try {
      await sentraDeleteTarget(id);
    } catch {
      sentraListTargets().then(setTargets).catch(() => {});
    }
  }

  async function openInstructions(id: string) {
    try {
      setInstructions(await sentraGetInstructions(id));
    } catch {
      /* noop */
    }
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 mt-6">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Globe className="w-5 h-5 text-green-500" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{dict.title}</h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{dict.desc}</p>

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input type="text" required placeholder={dict.addPlaceholder} value={domain} onChange={(e) => setDomain(e.target.value)} className={inputClass} />
        <button
          type="submit"
          disabled={adding}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          <Plus className="w-4 h-4" /> {adding ? dict.adding : dict.add}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-4">…</p>
      ) : targets.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 py-4 text-center">{dict.empty}</p>
      ) : (
        <ul className="space-y-4">
          {targets.map((t) => (
            <li key={t.id} className="rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{t.domain}</p>
                  <span
                    className={`inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold ${
                      t.verified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {t.verified ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    {t.verified ? dict.verified : dict.pending}
                  </span>
                  {verifyMsg?.id === t.id && (
                    <p className={`text-[12px] mt-1 ${verifyMsg.ok ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>{verifyMsg.text}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {t.verified ? (
                    <button
                      onClick={() => handleScan(t.id)}
                      disabled={scanningId === t.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-green-500 text-black text-[12px] font-bold hover:scale-105 transition-transform disabled:opacity-60"
                    >
                      <Radar className={`w-3.5 h-3.5 ${scanningId === t.id ? 'animate-spin' : ''}`} />
                      {scanningId === t.id ? s.scanning : scans[t.id]?.length ? s.rescan : s.scan}
                    </button>
                  ) : (
                    <>
                      <button onClick={() => openInstructions(t.id)} className="px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">DNS</button>
                      <button onClick={() => handleVerify(t.id)} disabled={verifyingId === t.id} className="px-3 py-1.5 rounded-full bg-green-500 text-black text-[12px] font-bold hover:scale-105 transition-transform disabled:opacity-60">
                        {verifyingId === t.id ? dict.verifying : dict.verify}
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete(t.id)} aria-label={dict.delete} className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {scans[t.id]?.length && (
                <>
                  <ScanResultPanel
                    scan={scans[t.id][0]}
                    history={scans[t.id]}
                    dict={s}
                    lang={lang}
                    onUpgrade={() => setUpgrade({ open: true })}
                  />
                  {scans[t.id][0].scans_remaining != null && (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 text-right">
                      {s.scansLeft.replace('{n}', String(scans[t.id][0].scans_remaining))}
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modal de instrucciones DNS */}
      <AnimatePresence>
        {instructions && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setInstructions(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-7 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{dict.instructionsTitle}</h3>
                <button onClick={() => setInstructions(null)} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm font-mono text-green-600 dark:text-green-400 mb-1">{instructions.domain}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{dict.instructionsIntro}</p>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">{dict.recordType}</p>
                  <code className="inline-block rounded-lg bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[13px] text-zinc-800 dark:text-zinc-200">TXT</code>
                </div>
                <CopyField label={dict.recordName} value={instructions.dns_record_name} copyLabel={dict.copy} copiedLabel={dict.copied} />
                <CopyField label={dict.recordValue} value={instructions.dns_record_value} copyLabel={dict.copy} copiedLabel={dict.copied} />
              </div>

              <div className="mt-6 rounded-2xl bg-zinc-50 dark:bg-black/30 border border-zinc-200 dark:border-zinc-800 p-4">
                <p className="text-[12px] font-bold text-zinc-700 dark:text-zinc-300 mb-2">{dict.guideTitle}</p>
                <ol className="space-y-1.5">
                  {dict.guideSteps.map((step, i) => (
                    <li key={i} className="flex gap-2.5 text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-3 mt-7">
                <button onClick={() => handleVerify(instructions.id)} disabled={verifyingId === instructions.id} className="flex-1 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] transition-transform disabled:opacity-60">
                  {verifyingId === instructions.id ? dict.verifying : dict.verify}
                </button>
                <button onClick={() => setInstructions(null)} className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">{dict.close}</button>
              </div>
              {verifyMsg?.id === instructions.id && !verifyMsg.ok && (
                <p className="text-[13px] text-amber-600 dark:text-amber-400 mt-4 text-center">{verifyMsg.text}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpgradeModal open={upgrade.open} onClose={() => setUpgrade({ open: false })} dict={upgradeDict} reason={upgrade.reason} />
    </div>
  );
}
