'use client';

import { useId, useState } from 'react';
import type { SentraScan } from '@/lib/sentra/api';

// Tendencia del Security Score en el tiempo. UNA sola serie (score 0-100),
// por eso no lleva leyenda: el título la nombra. Hue único de marca (verde),
// endpoint enfatizado, grid recesivo. SVG inline responsive (viewBox), sin
// dependencias — CSP-safe. Hover accesible vía <title> nativo por punto.
export default function ScoreTrend({
  scans,
  title,
  empty,
}: {
  scans: SentraScan[]; // en orden cronológico ascendente
  title: string;
  empty: string;
}) {
  const gradId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (scans.length < 2) {
    return <p className="text-[12px] text-zinc-400 dark:text-zinc-500 py-2">{empty}</p>;
  }

  // Espacio de coordenadas del viewBox. El SVG escala al ancho del contenedor.
  const W = 320;
  const H = 120;
  const padX = 24;
  const padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const n = scans.length;
  const x = (i: number) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (score: number) => padY + (1 - score / 100) * innerH;

  const pts = scans.map((s, i) => ({ x: x(i), y: y(s.score), scan: s }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath =
    `M ${pts[0].x.toFixed(1)} ${(H - padY).toFixed(1)} ` +
    pts.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ` L ${pts[n - 1].x.toFixed(1)} ${(H - padY).toFixed(1)} Z`;

  const last = pts[n - 1];

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">{title}</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={title}
        className="max-w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid recesivo: líneas guía en 0 / 50 / 100. */}
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line
              x1={padX}
              x2={W - padX}
              y1={y(g)}
              y2={y(g)}
              className="stroke-zinc-200 dark:stroke-zinc-800"
              strokeWidth="1"
              strokeDasharray={g === 0 || g === 100 ? '0' : '3 4'}
            />
            <text
              x={padX - 6}
              y={y(g) + 3}
              textAnchor="end"
              className="fill-zinc-400 dark:fill-zinc-600"
              style={{ fontSize: '9px', fontVariantNumeric: 'tabular-nums' }}
            >
              {g}
            </text>
          </g>
        ))}

        {/* Área + línea, hue único de marca. */}
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Puntos interactivos (hover accesible con <title>). */}
        {pts.map((p, i) => {
          const isLast = i === n - 1;
          const isHover = hover === i;
          return (
            <g key={p.scan.id}>
              <circle
                cx={p.x}
                cy={p.y}
                r={isLast || isHover ? 4.5 : 3}
                fill={isLast || isHover ? '#22c55e' : '#0a0a0a'}
                stroke="#22c55e"
                strokeWidth="2"
                className="[fill:theme(colors.white)] dark:[fill:theme(colors.zinc.950)]"
                style={isLast || isHover ? { fill: '#22c55e' } : undefined}
              />
              {/* Hit target más grande que la marca. */}
              <circle
                cx={p.x}
                cy={p.y}
                r="12"
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'pointer' }}
              >
                <title>
                  {p.scan.score}/100 · {p.scan.grade} — {new Date(p.scan.created_at).toLocaleDateString()}
                </title>
              </circle>
            </g>
          );
        })}

        {/* Etiqueta directa del último valor (no en cada punto). */}
        <text
          x={last.x}
          y={last.y - 9}
          textAnchor="middle"
          className="fill-zinc-900 dark:fill-white"
          style={{ fontSize: '11px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {scans[n - 1].score}
        </text>
      </svg>
    </div>
  );
}
