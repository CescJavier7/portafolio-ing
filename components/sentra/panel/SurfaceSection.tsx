'use client';

import { useEffect, useState } from 'react';
import { Share2, Globe, Server, Cpu, AlertTriangle, Search } from 'lucide-react';
import { loadDomainData } from '@/lib/sentra/domainData';
import { sentraDiscoverSurface, SentraApiError, type SentraSurface, type SentraTarget } from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface SurfaceDict {
  title: string;
  subtitle: string;
  intro: string;
  pick: string;
  discover: string;
  discovering: string;
  subdomains: string;
  ports: string;
  technologies: string;
  noSubs: string;
  noPorts: string;
  noTech: string;
  riskHigh: string;
  riskMedium: string;
  riskLow: string;
  disclaimer: string;
  empty: string;
}

function riskColor(risk: string): string {
  if (risk === 'alta') return 'text-red-600 dark:text-red-400 border-red-500/30 bg-red-500/10';
  if (risk === 'media') return 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10';
  return 'text-green-600 dark:text-green-400 border-green-500/30 bg-green-500/10';
}

export default function SurfaceSection({ dict, onUpgrade }: { dict: SurfaceDict; onUpgrade: () => void }) {
  const [targets, setTargets] = useState<SentraTarget[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [surface, setSurface] = useState<SentraSurface | null>(null);
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

  async function discover() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setSurface(null);
    try {
      setSurface(await sentraDiscoverSurface(selected));
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) onUpgrade();
      else setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  const riskLabel = (r: string) => (r === 'alta' ? dict.riskHigh : r === 'media' ? dict.riskMedium : dict.riskLow);

  return (
    <div>
      <SectionHeader icon={<Share2 className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />

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
              onClick={discover}
              disabled={busy}
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              <Search className={`w-4 h-4 ${busy ? 'animate-pulse' : ''}`} />
              {busy ? dict.discovering : dict.discover}
            </button>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>}

          {surface && (
            <div className="space-y-5">
              {/* Nodo raíz */}
              <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-green-500/15 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{dict.title}</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white">{surface.domain}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Subdominios */}
                <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white mb-3">
                    <Server className="w-4 h-4 text-teal-500" /> {dict.subdomains}
                    <span className="ml-auto text-[11px] font-mono text-zinc-400">{surface.subdomains.length}</span>
                  </p>
                  {surface.subdomains.length === 0 ? (
                    <p className="text-[13px] text-zinc-400 dark:text-zinc-500">{dict.noSubs}</p>
                  ) : (
                    <ul className="space-y-1.5 max-h-72 overflow-y-auto">
                      {surface.subdomains.map((s) => (
                        <li key={s.name} className="flex items-center justify-between gap-3 text-[13px]">
                          <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate">{s.name}</span>
                          <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500 shrink-0">{s.ip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Puertos + tecnologías */}
                <div className="space-y-5">
                  <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5">
                    <p className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> {dict.ports}
                    </p>
                    {surface.ports.length === 0 ? (
                      <p className="text-[13px] text-zinc-400 dark:text-zinc-500">{dict.noPorts}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {surface.ports.map((p) => (
                          <span
                            key={p.port}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-semibold ${riskColor(p.risk)}`}
                            title={`${riskLabel(p.risk)}`}
                          >
                            <span className="font-mono font-bold">{p.port}</span> {p.service}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5">
                    <p className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white mb-3">
                      <Cpu className="w-4 h-4 text-green-500" /> {dict.technologies}
                    </p>
                    {surface.technologies.length === 0 ? (
                      <p className="text-[13px] text-zinc-400 dark:text-zinc-500">{dict.noTech}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {surface.technologies.map((t) => (
                          <span key={t} className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[12px] font-mono text-zinc-600 dark:text-zinc-300">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">{dict.disclaimer}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
