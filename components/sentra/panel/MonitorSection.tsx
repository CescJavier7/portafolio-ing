'use client';

import { useEffect, useState } from 'react';
import { BellRing, ShieldCheck, ShieldAlert, Mail } from 'lucide-react';
import { loadDomainData, gradeColor } from '@/lib/sentra/domainData';
import { sentraSetMonitoring, type SentraScan, type SentraTarget } from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';
import { canManageTargets } from '@/lib/sentra/permissions';

export interface MonitorDict {
  title: string;
  subtitle: string;
  intro: string;
  emailNote: string;
  active: string;
  inactive: string;
  verifyFirst: string;
  lastScore: string;
  empty: string;
  readOnlyNote: string;
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

export default function MonitorSection({ dict, role }: { dict: MonitorDict; role: string }) {
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<SentraTarget[]>([]);
  const [scans, setScans] = useState<Record<string, SentraScan[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const canManage = canManageTargets(role); // activar/desactivar monitoreo

  useEffect(() => {
    loadDomainData()
      .then(({ targets, scans }) => {
        setTargets(targets);
        setScans(scans);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(t: SentraTarget) {
    if (!t.verified) return;
    setBusyId(t.id);
    const next = !t.monitoring_enabled;
    // Optimista: refleja el cambio ya; si falla, revierte.
    setTargets((prev) => prev.map((x) => (x.id === t.id ? { ...x, monitoring_enabled: next } : x)));
    try {
      await sentraSetMonitoring(t.id, next);
    } catch {
      setTargets((prev) => prev.map((x) => (x.id === t.id ? { ...x, monitoring_enabled: !next } : x)));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <SectionHeader icon={<BellRing className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />

      <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-4 mb-6 flex items-start gap-3">
        <Mail className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
        <p className="text-[13px] text-zinc-600 dark:text-zinc-300 leading-relaxed">{dict.intro}</p>
      </div>

      {!canManage && (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 mb-6">
          {dict.readOnlyNote}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-8">…</p>
      ) : targets.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.empty}</p>
        </div>
      ) : (
        <ul className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          {targets.map((t) => {
            const latest = scans[t.id]?.[0];
            return (
              <li key={t.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{t.domain}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {t.verified ? (
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                          t.monitoring_enabled ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t.monitoring_enabled ? dict.active : dict.inactive}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="w-3.5 h-3.5" /> {dict.verifyFirst}
                      </span>
                    )}
                    {latest && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                        <span
                          className="w-4 h-4 rounded text-[9px] font-black text-white flex items-center justify-center"
                          style={{ backgroundColor: gradeColor(latest.grade) }}
                        >
                          {latest.grade}
                        </span>
                        {dict.lastScore}: {latest.score}
                      </span>
                    )}
                  </div>
                </div>
                <Toggle on={t.monitoring_enabled} disabled={!t.verified || busyId === t.id || !canManage} onChange={() => toggle(t)} />
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-4">{dict.emailNote}</p>
    </div>
  );
}
