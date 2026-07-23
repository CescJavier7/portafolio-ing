'use client';

import { useMemo, useState } from 'react';

// Grafo visual de la superficie: el dominio raíz al centro y los subdominios
// en un anillo alrededor, con una arista cada uno. Los nodos se COLOREAN por
// grupo de IP — así, de un vistazo, ves cómo se agrupa tu infraestructura
// (p. ej. todos los que caen en las IPs de Cloudflare). Insight real, no
// decoración. SVG inline responsive, hover accesible con <title>.
const GROUP_PALETTE = ['#38bdf8', '#a78bfa', '#f472b6', '#fbbf24', '#34d399'];
const OTHER_COLOR = '#94a3b8';

export default function SurfaceGraph({
  domain,
  subdomains,
  legendOthers,
}: {
  domain: string;
  subdomains: { name: string; ip: string }[];
  legendOthers: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const { ips, colorFor } = useMemo(() => {
    // IPs ordenadas por frecuencia (la más común = primer color).
    const freq = new Map<string, number>();
    for (const s of subdomains) freq.set(s.ip, (freq.get(s.ip) ?? 0) + 1);
    const ordered = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([ip]) => ip);
    const color = (ip: string) => {
      const idx = ordered.indexOf(ip);
      return idx >= 0 && idx < GROUP_PALETTE.length ? GROUP_PALETTE[idx] : OTHER_COLOR;
    };
    return { ips: ordered, colorFor: color };
  }, [subdomains]);

  if (subdomains.length === 0) return null;

  const W = 640;
  const H = 460;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 70;
  const n = subdomains.length;

  const nodes = subdomains.map((s, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { ...s, x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), color: colorFor(s.ip) };
  });

  const legendIps = ips.slice(0, GROUP_PALETTE.length);
  const hasOthers = ips.length > GROUP_PALETTE.length;

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="max-w-full h-auto" role="img" aria-label={`Grafo de superficie de ${domain}`}>
        {/* Aristas raíz → subdominio */}
        {nodes.map((nd, i) => (
          <line
            key={`e-${i}`}
            x1={cx}
            y1={cy}
            x2={nd.x}
            y2={nd.y}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={hover === i ? 1.6 : 0.8}
            style={hover === i ? { stroke: nd.color } : undefined}
          />
        ))}

        {/* Nodos subdominio */}
        {nodes.map((nd, i) => (
          <g key={`n-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)} style={{ cursor: 'pointer' }}>
            <circle cx={nd.x} cy={nd.y} r={hover === i ? 7 : 5} fill={nd.color} stroke="#0a0a0a" strokeWidth="1.5" className="[stroke:theme(colors.white)] dark:[stroke:theme(colors.zinc.950)]" />
            {/* Área de toque más grande que la marca (accesible en táctil). */}
            <circle cx={nd.x} cy={nd.y} r="16" fill="transparent">
              <title>{nd.name} — {nd.ip}</title>
            </circle>
          </g>
        ))}

        {/* Nodo raíz */}
        <circle cx={cx} cy={cy} r="26" fill="#22c55e" opacity="0.15" />
        <circle cx={cx} cy={cy} r="17" fill="#22c55e" stroke="#0a0a0a" strokeWidth="2" className="[stroke:theme(colors.white)] dark:[stroke:theme(colors.zinc.950)]" />
        <text x={cx} y={cy + 34} textAnchor="middle" className="fill-zinc-900 dark:fill-white" style={{ fontSize: '13px', fontWeight: 800 }}>
          {domain}
        </text>

        {/* Tooltip: se dibuja al final para quedar sobre todo. */}
        {hover !== null && (() => {
          const nd = nodes[hover];
          const label = nd.name;
          const tw = Math.max(label.length, nd.ip.length + 4) * 6.6 + 22;
          const th = 40;
          let tx = nd.x - tw / 2;
          tx = Math.max(6, Math.min(W - tw - 6, tx));
          let ty = nd.y - th - 14;
          if (ty < 6) ty = nd.y + 16;
          return (
            <g style={{ pointerEvents: 'none' }}>
              <rect x={tx} y={ty} width={tw} height={th} rx="8" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <text x={tx + 12} y={ty + 17} fill="#ffffff" style={{ fontSize: '12px', fontWeight: 700 }}>{label}</text>
              <circle cx={tx + 14} cy={ty + 29} r="3.5" fill={nd.color} />
              <text x={tx + 23} y={ty + 32} fill="#94a3b8" style={{ fontSize: '11px', fontFamily: 'ui-monospace, monospace' }}>{nd.ip}</text>
            </g>
          );
        })()}
      </svg>

      {/* Leyenda: color → IP */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 px-2">
        {legendIps.map((ip, i) => (
          <span key={ip} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_PALETTE[i] }} />
            {ip}
          </span>
        ))}
        {hasOthers && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: OTHER_COLOR }} />
            {legendOthers}
          </span>
        )}
      </div>
    </div>
  );
}
