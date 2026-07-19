'use client';

import { gradeColor } from '@/lib/sentra/domainData';

// Gráficas del panel. Siguen los estándares analíticos: una sola métrica
// por gráfica, color por severidad (verde→rojo) SIEMPRE con la letra/nota
// como codificación secundaria (nunca color solo), track recesivo, extremos
// redondeados, etiquetas directas y tabular-nums. CSS-only, responsive.

export function StatTile({
  value,
  label,
  accent,
  sub,
}: {
  value: string | number;
  label: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5">
      <div
        className="text-3xl font-black tracking-tight leading-none"
        style={{ color: accent ?? 'inherit', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mt-2">{label}</div>
      {sub && <div className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

// Distribución de notas A–F: barras horizontales por letra, con conteo.
export function GradeBars({ dist, title }: { dist: Record<string, number>; title: string }) {
  const grades = ['A', 'B', 'C', 'D', 'F'];
  const max = Math.max(1, ...grades.map((g) => dist[g] ?? 0));
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">{title}</p>
      <div className="flex flex-col gap-2.5">
        {grades.map((g) => {
          const n = dist[g] ?? 0;
          const pct = (n / max) * 100;
          return (
            <div key={g} className="flex items-center gap-3" title={`${g}: ${n}`}>
              <span
                className="w-6 h-6 shrink-0 rounded-md text-[12px] font-black flex items-center justify-center text-white"
                style={{ backgroundColor: gradeColor(g) }}
              >
                {g}
              </span>
              <div className="flex-1 h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${pct}%`, backgroundColor: gradeColor(g) }}
                />
              </div>
              <span
                className="w-6 text-right text-sm font-bold text-zinc-700 dark:text-zinc-300"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Ranking de dominios por score (barra = score/100, color por nota).
export function DomainRanking({
  rows,
  title,
  empty,
}: {
  rows: { domain: string; score: number; grade: string }[];
  title: string;
  empty: string;
}) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-4">{title}</p>
      {sorted.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 py-2">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {sorted.map((r) => (
            <div key={r.domain} title={`${r.domain}: ${r.score}/100 (${r.grade})`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-semibold text-zinc-800 dark:text-zinc-200 truncate pr-2">{r.domain}</span>
                <span
                  className="text-[13px] font-black shrink-0"
                  style={{ color: gradeColor(r.grade), fontVariantNumeric: 'tabular-nums' }}
                >
                  {r.score}
                  <span className="text-[10px] ml-1 align-top">{r.grade}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${r.score}%`, backgroundColor: gradeColor(r.grade) }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
