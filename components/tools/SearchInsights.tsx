'use client';

import { useEffect, useState } from 'react';
import { LineChart, TrendingUp, TrendingDown, Info, CheckCircle2 } from 'lucide-react';
import { sentraGetInsights, type SentraInsights, type SentraInsight } from '@/lib/sentra/api';

// Learning Loop (FASE 4): diagnóstico de la búsqueda sobre las postulaciones del
// usuario. Determinista en backend; aquí solo se pinta. Se pliega si no hay datos.

type L = {
  title: string;
  subtitle: string;
  funnel: Record<'saved' | 'applied' | 'interview' | 'offer' | 'rejected', string>;
  responseRate: string;
  interviewRate: string;
  offerRate: string;
  avgScore: string;
  insight: (code: string, v: number) => string;
};

const T: Record<'es' | 'en', L> = {
  es: {
    title: 'Diagnóstico de tu búsqueda',
    subtitle: 'Cómo va tu embudo y qué ajustar — basado en tus postulaciones.',
    funnel: { saved: 'Guardadas', applied: 'Postuladas', interview: 'Entrevista', offer: 'Oferta', rejected: 'Rechazadas' },
    responseRate: 'Tasa de respuesta',
    interviewRate: 'Tasa de entrevista',
    offerRate: 'Tasa de oferta',
    avgScore: 'Score promedio',
    insight: (code, v) =>
      ({
        no_data: 'Aún no tienes postulaciones para analizar. Empieza a registrar tus aplicaciones.',
        good_momentum: `Buen ritmo: ${v} postulaciones en los últimos 7 días.`,
        low_activity: `Llevas ${v} días sin postular. Retoma el ritmo para no perder tracción.`,
        update_statuses: `Tienes ${v} guardadas sin marcar como postuladas. Actualiza sus estados para medir tu embudo.`,
        low_response: `Tu tasa de respuesta es ${v}%. Revisa tu CV o apunta a ofertas con mejor match.`,
        strong_response: `Excelente: ${v}% de tus postulaciones reciben respuesta.`,
        score_correlation: `Las ofertas con mayor Application Score te dan más entrevistas (+${v} pts de media). Prioriza el score alto.`,
        interview_stage: `Ya tienes ${v} en entrevista u oferta. Vas por buen camino.`,
      })[code] ?? '',
  },
  en: {
    title: 'Your search diagnostics',
    subtitle: 'How your funnel is doing and what to adjust — based on your applications.',
    funnel: { saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' },
    responseRate: 'Response rate',
    interviewRate: 'Interview rate',
    offerRate: 'Offer rate',
    avgScore: 'Avg. score',
    insight: (code, v) =>
      ({
        no_data: "You don't have applications to analyze yet. Start logging your applications.",
        good_momentum: `Good momentum: ${v} applications in the last 7 days.`,
        low_activity: `It's been ${v} days since your last application. Pick the pace back up.`,
        update_statuses: `You have ${v} saved but not marked as applied. Update their statuses to measure your funnel.`,
        low_response: `Your response rate is ${v}%. Review your CV or target better-matching roles.`,
        strong_response: `Great: ${v}% of your applications get a response.`,
        score_correlation: `Higher Application Score offers get you more interviews (+${v} pts on average). Prioritize high score.`,
        interview_stage: `You already have ${v} in interview or offer stage. You're on track.`,
      })[code] ?? '',
  },
};

const FUNNEL_ORDER = ['saved', 'applied', 'interview', 'offer', 'rejected'] as const;
const FUNNEL_COLOR: Record<(typeof FUNNEL_ORDER)[number], string> = {
  saved: 'text-zinc-500 dark:text-zinc-400',
  applied: 'text-blue-600 dark:text-blue-400',
  interview: 'text-amber-600 dark:text-amber-400',
  offer: 'text-green-600 dark:text-green-400',
  rejected: 'text-red-600 dark:text-red-400',
};
const FUNNEL_BAR: Record<(typeof FUNNEL_ORDER)[number], string> = {
  saved: 'bg-zinc-400',
  applied: 'bg-blue-500',
  interview: 'bg-amber-500',
  offer: 'bg-green-500',
  rejected: 'bg-red-500',
};

const LEVEL_STYLE: Record<SentraInsight['level'], { cls: string; icon: React.ReactNode }> = {
  good: { cls: 'border-green-500/25 bg-green-500/5 text-green-700 dark:text-green-300', icon: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> },
  warn: { cls: 'border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300', icon: <TrendingDown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> },
  info: { cls: 'border-zinc-300/60 dark:border-zinc-700 bg-zinc-500/5 text-zinc-600 dark:text-zinc-300', icon: <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" /> },
};

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

export default function SearchInsights({ lang }: { lang: 'es' | 'en' }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const [data, setData] = useState<SentraInsights | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    sentraGetInsights()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // No mostrar nada hasta cargar; si el usuario no tiene datos, plegar (para no
  // ensuciar el tracker vacío del primer uso).
  if (!loaded || !data || data.total === 0) return null;

  const maxFunnel = Math.max(1, ...FUNNEL_ORDER.map((s) => data.funnel[s]));

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8 mb-6">
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <LineChart className="w-5 h-5 text-green-500" />
        </span>
        <div>
          <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{t.title}</h2>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">{t.subtitle}</p>
        </div>
      </div>

      {/* Embudo */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {FUNNEL_ORDER.map((s) => (
          <div key={s} className="text-center">
            <div className="h-20 flex items-end justify-center mb-1.5">
              <div
                className={`w-full rounded-t-lg ${FUNNEL_BAR[s]} transition-all`}
                style={{ height: `${Math.max(6, (data.funnel[s] / maxFunnel) * 100)}%` }}
              />
            </div>
            <p className={`text-lg font-black tabular-nums ${FUNNEL_COLOR[s]}`}>{data.funnel[s]}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400 truncate">{t.funnel[s]}</p>
          </div>
        ))}
      </div>

      {/* Tasas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        <Metric label={t.responseRate} value={pct(data.response_rate)} />
        <Metric label={t.interviewRate} value={pct(data.interview_rate)} />
        <Metric label={t.offerRate} value={pct(data.offer_rate)} />
        <Metric label={t.avgScore} value={data.avg_score != null ? String(data.avg_score) : '—'} />
      </div>

      {/* Observaciones */}
      {data.insights.length > 0 && (
        <ul className="space-y-2">
          {data.insights.map((it, i) => {
            const s = LEVEL_STYLE[it.level];
            return (
              <li key={i} className={`flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-[13px] ${s.cls}`}>
                {s.icon}
                <span>{t.insight(it.code, it.value)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 truncate">{label}</p>
      <p className="text-lg font-black text-zinc-900 dark:text-white tabular-nums flex items-center gap-1">
        <TrendingUp className="w-3.5 h-3.5 text-green-500" /> {value}
      </p>
    </div>
  );
}
