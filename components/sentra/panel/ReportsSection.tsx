'use client';

import { useEffect, useState } from 'react';
import { FileText, Download, Lock } from 'lucide-react';
import { loadDomainData, gradeColor } from '@/lib/sentra/domainData';
import { openScanReport, type PdfLabels } from '@/lib/sentra/pdfReport';
import { sentraGenerateReport, sentraSaveReport, type SentraScan } from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface ReportsDict {
  title: string;
  subtitle: string;
  domain: string;
  date: string;
  score: string;
  pdf: string;
  download: string;
  downloading: string;
  locked: string;
  upgrade: string;
  empty: string;
  countLabel: string;
}

export default function ReportsSection({
  dict,
  pdfLabels,
  lang,
  onUpgrade,
}: {
  dict: ReportsDict;
  pdfLabels: PdfLabels;
  lang: string;
  onUpgrade: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [scans, setScans] = useState<SentraScan[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    loadDomainData()
      .then(({ scans }) => {
        // Aplanar todos los escaneos de todos los dominios, más recientes primero.
        const all = Object.values(scans).flat();
        all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setScans(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Descarga = informe COMPLETO. Si el escaneo ya tiene el informe IA
  // persistido, se usa al instante (sin esperar al LLM). Si no, se genera y
  // se guarda; si la IA falla, se abre con la parte estructurada (fallback).
  async function handleDownload(scan: SentraScan) {
    if (!scan.findings) return;
    if (scan.ai_report) {
      openScanReport(scan, pdfLabels, scan.ai_report);
      return;
    }
    setDownloadingId(scan.id);
    try {
      const report = await sentraGenerateReport({
        domain: scan.domain,
        score: scan.score,
        grade: scan.grade,
        findings: scan.findings,
        lang,
      });
      openScanReport(scan, pdfLabels, report);
      sentraSaveReport(scan.target_id, scan.id, report).catch(() => {});
    } catch {
      openScanReport(scan, pdfLabels, null);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div>
      <SectionHeader icon={<FileText className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-8">…</p>
      ) : scans.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.empty}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <p className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
            {scans.length} {dict.countLabel}
          </p>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {scans.map((scan) => {
              const canPdf = Boolean(scan.findings);
              return (
                <li key={scan.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span
                    className="w-9 h-9 shrink-0 rounded-lg text-[13px] font-black flex items-center justify-center text-white"
                    style={{ backgroundColor: gradeColor(scan.grade) }}
                  >
                    {scan.grade}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{scan.domain}</p>
                    <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                      {new Date(scan.created_at).toLocaleString()} · {scan.score}/100
                    </p>
                  </div>
                  {canPdf ? (
                    <button
                      onClick={() => handleDownload(scan)}
                      disabled={downloadingId === scan.id}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                    >
                      <Download className={`w-3.5 h-3.5 ${downloadingId === scan.id ? 'animate-pulse' : ''}`} />
                      {downloadingId === scan.id ? dict.downloading : dict.download}
                    </button>
                  ) : (
                    <button
                      onClick={onUpgrade}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-amber-500/30 text-[12px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
                      title={dict.locked}
                    >
                      <Lock className="w-3.5 h-3.5" /> {dict.upgrade}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
