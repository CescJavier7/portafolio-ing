'use client';

import { useEffect, useState } from 'react';
import { Route, Search, ShieldCheck } from 'lucide-react';
import { loadDomainData } from '@/lib/sentra/domainData';
import {
  sentraAnalyzeExposure,
  sentraGetLatestExposure,
  SentraApiError,
  type SentraExposure,
  type SentraTarget,
} from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface ExposureDict {
  title: string;
  subtitle: string;
  intro: string;
  analyze: string;
  analyzing: string;
  empty: string;
  clean: string;
  evidence: string;
  impact: string;
  recommendation: string;
  routesLabel: string;
  sevCritica: string;
  sevAlta: string;
  sevMedia: string;
  sevBaja: string;
  disclaimer: string;
  lastUpdated: string;
  refresh: string;
}

function sevStyle(sev: string): { chip: string; bar: string; label: (d: ExposureDict) => string } {
  switch (sev) {
    case 'critica':
      return { chip: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30', bar: 'bg-red-500', label: (d) => d.sevCritica };
    case 'alta':
      return { chip: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30', bar: 'bg-orange-500', label: (d) => d.sevAlta };
    case 'media':
      return { chip: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30', bar: 'bg-amber-500', label: (d) => d.sevMedia };
    default:
      return { chip: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30', bar: 'bg-sky-500', label: (d) => d.sevBaja };
  }
}

export default function ExposureSection({ dict, onUpgrade }: { dict: ExposureDict; onUpgrade: () => void }) {
  const [targets, setTargets] = useState<SentraTarget[]>([]);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [result, setResult] = useState<SentraExposure | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDomainData()
      .then(({ targets }) => {
        const verified = targets.filter((t) => t.verified);
        setTargets(verified);
        if (verified[0]) setSelected(verified[0].id);
      })
      .catch(() => {});
  }, []);

  // Auto-carga: al elegir un dominio, muestra el ÚLTIMO análisis guardado
  // sin esperar ni recalcular. Antes se perdía al cambiar de sección.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    setLoadingLatest(true);
    setResult(null);
    setError(null);
    sentraGetLatestExposure(selected)
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingLatest(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  async function analyze() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await sentraAnalyzeExposure(selected));
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) onUpgrade();
      else setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader icon={<Route className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5 max-w-2xl">{dict.intro}</p>

      {targets.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.empty}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.domain}</option>
              ))}
            </select>
            <button
              onClick={analyze}
              disabled={busy || loadingLatest}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <Search className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
              {busy ? dict.analyzing : result ? dict.refresh : dict.analyze}
            </button>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>}

          {loadingLatest && <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-4">…</p>}

          {result && (
            <div className="space-y-5">
              {result.created_at && (
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-right -mb-2">
                  {dict.lastUpdated}: {new Date(result.created_at).toLocaleString()}
                </p>
              )}
              {/* Resumen por severidad */}
              <div className="flex flex-wrap gap-2">
                {(['critica', 'alta', 'media', 'baja'] as const).map((sev) => {
                  const n = result.counts[sev] ?? 0;
                  const st = sevStyle(sev);
                  return (
                    <span key={sev} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-bold ${st.chip}`}>
                      <span className="font-mono text-[14px]">{n}</span> {st.label(dict)}
                    </span>
                  );
                })}
                <span className="ml-auto text-[12px] text-zinc-400 dark:text-zinc-500 self-center">
                  {result.routes.length} {dict.routesLabel}
                </span>
              </div>

              {result.routes.length === 0 ? (
                <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-8 text-center">
                  <ShieldCheck className="w-8 h-8 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">{dict.clean}</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {result.routes.map((r) => {
                    const st = sevStyle(r.severity);
                    return (
                      <li key={r.id} className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                        <div className={`h-1 ${st.bar}`} />
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white">{r.title}</h3>
                            <span className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wide ${st.chip}`}>
                              {st.label(dict)}
                            </span>
                          </div>

                          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-1.5">{dict.evidence}</p>
                          <ul className="flex flex-wrap gap-1.5 mb-4">
                            {r.evidence.map((e, i) => (
                              <li key={i} className="text-[12px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
                                {e}
                              </li>
                            ))}
                          </ul>

                          <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
                            <span className="font-bold text-zinc-800 dark:text-zinc-100">{dict.impact}: </span>{r.impact}
                          </p>
                          <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            <span className="font-bold text-green-600 dark:text-green-400">{dict.recommendation}: </span>{r.recommendation}
                          </p>

                          {r.references.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {r.references.map((ref) => (
                                <span key={`${ref.framework}-${ref.ref}`} title={ref.title} className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400">
                                  {ref.framework} {ref.ref}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{dict.disclaimer}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
