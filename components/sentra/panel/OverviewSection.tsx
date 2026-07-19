'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { loadDomainData, gradeColor } from '@/lib/sentra/domainData';
import { StatTile, GradeBars, DomainRanking } from '@/components/sentra/PanelCharts';

export interface OverviewDict {
  title: string;
  subtitle: string;
  kpiDomains: string;
  kpiVerified: string;
  kpiAvg: string;
  kpiScans: string;
  gradeDist: string;
  ranking: string;
  noData: string;
  empty: string;
}

export default function OverviewSection({ dict }: { dict: OverviewDict }) {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ domains: 0, verified: 0, avg: 0, scans: 0, hasScans: false });
  const [dist, setDist] = useState<Record<string, number>>({});
  const [ranking, setRanking] = useState<{ domain: string; score: number; grade: string }[]>([]);

  useEffect(() => {
    loadDomainData()
      .then(({ targets, scans }) => {
        const verified = targets.filter((t) => t.verified);
        const latest = targets
          .map((t) => ({ t, s: scans[t.id]?.[0] }))
          .filter((x): x is { t: (typeof targets)[number]; s: NonNullable<typeof x.s> } => Boolean(x.s));

        const scores = latest.map((x) => x.s.score);
        const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const totalScans = Object.values(scans).reduce((a, arr) => a + arr.length, 0);

        const d: Record<string, number> = {};
        for (const x of latest) d[x.s.grade] = (d[x.s.grade] ?? 0) + 1;

        setKpi({ domains: targets.length, verified: verified.length, avg, scans: totalScans, hasScans: latest.length > 0 });
        setDist(d);
        setRanking(latest.map((x) => ({ domain: x.t.domain, score: x.s.score, grade: x.s.grade })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const avgGrade = kpi.avg >= 90 ? 'A' : kpi.avg >= 80 ? 'B' : kpi.avg >= 70 ? 'C' : kpi.avg >= 60 ? 'D' : 'F';

  return (
    <div>
      <SectionHeader icon={<Globe className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-8">…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile value={kpi.domains} label={dict.kpiDomains} />
            <StatTile value={kpi.verified} label={dict.kpiVerified} />
            <StatTile
              value={kpi.hasScans ? kpi.avg : '—'}
              label={dict.kpiAvg}
              accent={kpi.hasScans ? gradeColor(avgGrade) : undefined}
              sub={kpi.hasScans ? avgGrade : undefined}
            />
            <StatTile value={kpi.scans} label={dict.kpiScans} />
          </div>

          {kpi.hasScans ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GradeBars dist={dist} title={dict.gradeDist} />
              <DomainRanking rows={ranking} title={dict.ranking} empty={dict.empty} />
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-10 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.noData}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
        {icon}
      </div>
      <div>
        <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">{title}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}
