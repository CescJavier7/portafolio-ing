'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, ShieldCheck, FileText, Briefcase, Radar, Inbox, AlertTriangle, Clock } from 'lucide-react';
import { sentraFounderMetrics, type SentraFounderMetrics } from '@/lib/sentra/api';

const PLAN_ORDER = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'] as const;
const PLAN_COLOR: Record<string, string> = {
  FREE: 'bg-zinc-400',
  PRO: 'bg-green-500',
  TEAM: 'bg-blue-500',
  ENTERPRISE: 'bg-violet-500',
};

function KPI({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
        {icon} {label}
      </div>
      <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-white/5 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{icon} {label}</p>
      <p className="text-xl font-black text-zinc-900 dark:text-white tabular-nums mt-0.5">{value.toLocaleString()}</p>
    </div>
  );
}

export default function FounderMetrics({ lang }: { lang: 'es' | 'en' }) {
  const en = lang === 'en';
  // Auto-fetch + auto-oculto (mismo patrón que FounderPayments): si /metrics da
  // 403 (no eres fundador) no se renderiza nada.
  const [data, setData] = useState<SentraFounderMetrics | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    sentraFounderMetrics()
      .then((d) => alive && setData(d))
      .catch(() => alive && setHidden(true));
    return () => {
      alive = false;
    };
  }, []);

  if (hidden || !data) return null;
  const totalOrgs = data.orgs.total || 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">{en ? 'Founder metrics' : 'Métricas del fundador'}</h2>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{en ? 'Business overview of the whole platform.' : 'Vista de negocio de toda la plataforma.'}</p>
      </div>

      {/* Pagos pendientes: lo que necesita tu atención YA */}
      {data.revenue.pending_payments > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-[13px] text-zinc-700 dark:text-zinc-200">
            <strong>{data.revenue.pending_payments}</strong>{' '}
            {en ? 'payment(s) pending your approval.' : 'pago(s) pendiente(s) de tu aprobación.'}
          </p>
        </div>
      )}

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="MRR" value={`$${data.revenue.mrr_estimate_usd.toLocaleString()}`} sub={en ? 'estimated / month' : 'estimado / mes'} icon={<TrendingUp className="w-3.5 h-3.5 text-green-500" />} />
        <KPI label={en ? 'Paid orgs' : 'Orgs de pago'} value={String(data.orgs.paid_active)} sub={`${en ? 'of' : 'de'} ${data.orgs.total} ${en ? 'orgs' : 'orgs'}`} icon={<ShieldCheck className="w-3.5 h-3.5 text-green-500" />} />
        <KPI label={en ? 'Users' : 'Usuarios'} value={String(data.users.total)} sub={`+${data.users.new_7d} ${en ? 'this week' : 'esta semana'}`} icon={<Users className="w-3.5 h-3.5 text-green-500" />} />
        <KPI label={en ? 'New (30d)' : 'Nuevos (30d)'} value={`+${data.users.new_30d}`} sub={en ? 'signups' : 'altas'} icon={<Users className="w-3.5 h-3.5 text-green-500" />} />
      </div>

      {/* Distribución de planes */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3">{en ? 'Plan distribution' : 'Distribución de planes'}</p>
        <div className="flex h-3 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 mb-3">
          {PLAN_ORDER.map((p) => {
            const n = data.orgs.by_plan[p] ?? 0;
            const w = (n / totalOrgs) * 100;
            return w > 0 ? <div key={p} className={PLAN_COLOR[p]} style={{ width: `${w}%` }} title={`${p}: ${n}`} /> : null;
          })}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          {PLAN_ORDER.map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5 text-[12px] text-zinc-600 dark:text-zinc-300">
              <span className={`w-2.5 h-2.5 rounded-full ${PLAN_COLOR[p]}`} /> {p} · <strong className="tabular-nums">{data.orgs.by_plan[p] ?? 0}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* Actividad de la plataforma */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">{en ? 'Platform activity' : 'Actividad de la plataforma'}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <Stat label={en ? 'Domains' : 'Dominios'} value={data.activity.targets} icon={<ShieldCheck className="w-3 h-3" />} />
          <Stat label="Scans" value={data.activity.scans} icon={<Radar className="w-3 h-3" />} />
          <Stat label="CVs" value={data.activity.cvs} icon={<FileText className="w-3 h-3" />} />
          <Stat label={en ? 'Applications' : 'Postulaciones'} value={data.activity.applications} icon={<Briefcase className="w-3 h-3" />} />
          <Stat label={en ? 'Captured' : 'Capturadas'} value={data.activity.captured_offers} icon={<Inbox className="w-3 h-3" />} />
        </div>
      </div>

      {/* Últimas altas */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> {en ? 'Latest signups' : 'Últimas altas'}
        </p>
        {data.recent_signups.length === 0 ? (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{en ? 'No signups yet.' : 'Aún no hay altas.'}</p>
        ) : (
          <ul className="space-y-1.5">
            {data.recent_signups.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-[13px]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${PLAN_COLOR[s.plan] ?? 'bg-zinc-400'}`} />
                <span className="text-zinc-700 dark:text-zinc-200 truncate flex-1">{s.email}</span>
                <span className="text-[11px] font-bold uppercase text-zinc-400">{s.plan}</span>
                <span className="text-[11px] text-zinc-400 tabular-nums shrink-0">
                  {s.created_at ? new Date(s.created_at).toLocaleDateString(en ? 'en-US' : 'es-EC') : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
