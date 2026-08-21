'use client';

import { useState } from 'react';
import {
  Inbox,
  Plus,
  Loader2,
  Zap,
  FileText,
  ShieldAlert,
  CopyCheck,
  ThumbsUp,
  ThumbsDown,
  X,
  Play,
  Check,
} from 'lucide-react';
import {
  sentraEvaluateOffer,
  sentraGenerateCVFromProfile,
  sentraCreateApplication,
  SentraApiError,
  type SentraEvaluation,
  type SentraVerdict,
} from '@/lib/sentra/api';

// Bandeja del agente (FASE 3): pega varias ofertas → evalúa todas (firewall +
// score, reusa /agent/evaluate) → agrupa en Estafas / Descartes / Vale la pena →
// prepara SOLO las buenas (CV a medida desde tu perfil + registro). Orquesta en
// cliente, secuencial (respeta el rate limit y muestra progreso). Sin backend nuevo.

type Bucket = 'scam' | 'discard' | 'worth';

interface Item {
  id: string;
  text: string;
  status: 'pending' | 'evaluating' | 'done' | 'error';
  ev?: SentraEvaluation;
  error?: string;
  preparing?: boolean;
  prepared?: { cvId: string; match: number };
  prepareErr?: string;
}

const T = {
  es: {
    title: 'Bandeja del agente',
    subtitle: 'Pega varias ofertas, el agente las evalúa todas y te deja preparar solo las que valen la pena.',
    placeholder: 'Pega aquí una oferta completa…',
    add: 'Añadir a la bandeja',
    empty: 'Tu bandeja está vacía. Pega una oferta arriba y añádela.',
    evaluateAll: 'Evaluar bandeja',
    evaluating: 'Evaluando…',
    prepareWorth: 'Preparar todas las que valen',
    clearDone: 'Vaciar bandeja',
    tooShort: 'La oferta es muy corta.',
    // buckets
    worth: 'Vale la pena',
    discard: 'Para descartar',
    scam: 'Posible estafa',
    // per item
    prepare: 'Preparar',
    preparing: 'Preparando…',
    preparedOk: 'Aplicación preparada',
    match: 'Match',
    openCV: 'Abrir CV',
    dupNote: 'Ya aplicaste a algo similar',
    noProfile: 'Genera tu primer CV en el generador para que el agente aprenda tu perfil.',
    prepareErr: 'No se pudo preparar. Inténtalo de nuevo.',
    evErr: 'No se pudo evaluar.',
    remove: 'Quitar',
    summary: (n: number, w: number, d: number, s: number) =>
      `${n} evaluada(s) · ${w} para aplicar · ${d} descarte(s) · ${s} estafa(s)`,
    verdict: { apply: 'Aplicar', maybe: 'Aplicar solo si…', avoid: 'No aplicar' } as Record<SentraVerdict, string>,
  },
  en: {
    title: 'Agent inbox',
    subtitle: 'Paste several job postings; the agent scores them all and lets you prepare only the ones worth it.',
    placeholder: 'Paste a full job posting here…',
    add: 'Add to inbox',
    empty: 'Your inbox is empty. Paste a posting above and add it.',
    evaluateAll: 'Evaluate inbox',
    evaluating: 'Evaluating…',
    prepareWorth: 'Prepare all worth applying',
    clearDone: 'Clear inbox',
    tooShort: 'The posting is too short.',
    worth: 'Worth applying',
    discard: 'To discard',
    scam: 'Possible scam',
    prepare: 'Prepare',
    preparing: 'Preparing…',
    preparedOk: 'Application prepared',
    match: 'Match',
    openCV: 'Open CV',
    dupNote: 'You already applied to something similar',
    noProfile: 'Generate your first CV in the builder so the agent learns your profile.',
    prepareErr: 'Could not prepare. Please try again.',
    evErr: 'Could not evaluate.',
    remove: 'Remove',
    summary: (n: number, w: number, d: number, s: number) =>
      `${n} evaluated · ${w} to apply · ${d} discard(s) · ${s} scam(s)`,
    verdict: { apply: 'Apply', maybe: 'Apply only if…', avoid: "Don't apply" } as Record<SentraVerdict, string>,
  },
};

function bucketOf(ev: SentraEvaluation): Bucket {
  if (ev.firewall && ev.firewall.risk_level === 'danger') return 'scam';
  if (ev.duplicate) return 'discard';
  if (ev.verdict === 'avoid') return 'discard';
  return 'worth';
}

const BUCKET_ORDER: Bucket[] = ['worth', 'discard', 'scam'];

export default function AgentInbox({ lang }: { lang: 'es' | 'en' }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const [draft, setDraft] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);

  const patch = (id: string, part: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...part } : it)));

  function add() {
    const text = draft.trim();
    if (text.length < 30) return;
    setItems((prev) => [...prev, { id: crypto.randomUUID(), text, status: 'pending' }]);
    setDraft('');
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function evaluateAll() {
    const targets = items.filter((it) => it.status === 'pending' || it.status === 'error');
    if (targets.length === 0) return;
    setRunning(true);
    for (const it of targets) {
      patch(it.id, { status: 'evaluating', error: undefined });
      try {
        const ev = await sentraEvaluateOffer(it.text);
        patch(it.id, { status: 'done', ev });
      } catch (e) {
        patch(it.id, { status: 'error', error: e instanceof SentraApiError ? e.detail : t.evErr });
      }
    }
    setRunning(false);
  }

  async function prepare(id: string) {
    const it = items.find((x) => x.id === id);
    if (!it || !it.ev) return;
    patch(id, { preparing: true, prepareErr: undefined });
    try {
      const cv = await sentraGenerateCVFromProfile({ job_posting: it.text, title: it.ev.role || undefined });
      try {
        await sentraCreateApplication({
          company: it.ev.company || '—',
          role: it.ev.role || cv.title,
          cv_document_id: cv.id,
          score: it.ev.score,
          status: 'saved',
        });
      } catch {
        /* registro best-effort */
      }
      patch(id, { preparing: false, prepared: { cvId: cv.id, match: cv.match_score } });
    } catch (e) {
      const msg = e instanceof SentraApiError && e.status === 409 ? t.noProfile : e instanceof SentraApiError ? e.detail : t.prepareErr;
      patch(id, { preparing: false, prepareErr: msg });
    }
  }

  async function prepareAllWorth() {
    const worth = items.filter((it) => it.ev && bucketOf(it.ev) === 'worth' && !it.prepared && !it.preparing);
    for (const it of worth) {
      // secuencial: cada prepare consume cuota y hace IA
      // eslint-disable-next-line no-await-in-loop
      await prepare(it.id);
    }
  }

  const done = items.filter((it) => it.status === 'done' && it.ev);
  const counts = {
    worth: done.filter((it) => bucketOf(it.ev!) === 'worth').length,
    discard: done.filter((it) => bucketOf(it.ev!) === 'discard').length,
    scam: done.filter((it) => bucketOf(it.ev!) === 'scam').length,
  };
  const grouped: Record<Bucket, Item[]> = {
    worth: done.filter((it) => bucketOf(it.ev!) === 'worth'),
    discard: done.filter((it) => bucketOf(it.ev!) === 'discard'),
    scam: done.filter((it) => bucketOf(it.ev!) === 'scam'),
  };
  const pending = items.filter((it) => it.status !== 'done');

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8">
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Inbox className="w-5 h-5 text-green-500" />
        </span>
        <div>
          <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{t.title}</h2>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">{t.subtitle}</p>
        </div>
      </div>

      {/* Alta de ofertas */}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.placeholder}
        rows={4}
        className="w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition resize-y"
      />
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={add}
          disabled={draft.trim().length < 30}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-[13px] font-bold text-zinc-700 dark:text-zinc-200 hover:border-green-400 disabled:opacity-50 transition"
        >
          <Plus className="w-4 h-4" /> {t.add}
        </button>
        <button
          onClick={evaluateAll}
          disabled={running || items.every((it) => it.status === 'done')}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-500 text-black text-[13px] font-black hover:brightness-105 active:scale-[0.98] disabled:opacity-60 transition"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? t.evaluating : t.evaluateAll}
        </button>
        {counts.worth > 0 && (
          <button
            onClick={prepareAllWorth}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black text-[13px] font-black hover:brightness-105 active:scale-[0.98] transition"
          >
            <Zap className="w-4 h-4" /> {t.prepareWorth} ({counts.worth})
          </button>
        )}
        {items.length > 0 && (
          <button onClick={() => setItems([])} className="ml-auto text-[12px] font-semibold text-zinc-400 hover:text-red-500 transition">
            {t.clearDone}
          </button>
        )}
      </div>

      {/* Resumen */}
      {done.length > 0 && (
        <p className="text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 mt-4">
          {t.summary(done.length, counts.worth, counts.discard, counts.scam)}
        </p>
      )}

      {/* Cola pendiente / en curso */}
      {pending.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pending.map((it) => (
            <li
              key={it.id}
              className="flex items-center gap-3 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5"
            >
              {it.status === 'evaluating' ? (
                <Loader2 className="w-4 h-4 animate-spin text-green-500 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600 shrink-0" />
              )}
              <span className="text-[13px] text-zinc-600 dark:text-zinc-300 truncate flex-1">{it.text.slice(0, 90)}</span>
              {it.status === 'error' && <span className="text-[11px] text-red-500 shrink-0">{it.error}</span>}
              <button onClick={() => remove(it.id)} title={t.remove} className="shrink-0 p-1 rounded text-zinc-400 hover:text-red-500 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Resultados agrupados */}
      {done.length > 0 && (
        <div className="mt-6 space-y-6">
          {BUCKET_ORDER.filter((b) => grouped[b].length > 0).map((b) => (
            <BucketSection key={b} bucket={b} items={grouped[b]} t={t} lang={lang} onPrepare={prepare} />
          ))}
        </div>
      )}

      {items.length === 0 && <p className="text-[13px] text-zinc-500 dark:text-zinc-400 py-8 text-center">{t.empty}</p>}
    </div>
  );
}

const BUCKET_STYLE: Record<Bucket, { ring: string; label: string; icon: React.ReactNode }> = {
  worth: { ring: 'border-green-500/30', label: 'text-green-600 dark:text-green-400', icon: <ThumbsUp className="w-4 h-4" /> },
  discard: { ring: 'border-amber-500/30', label: 'text-amber-600 dark:text-amber-400', icon: <ThumbsDown className="w-4 h-4" /> },
  scam: { ring: 'border-red-500/40', label: 'text-red-600 dark:text-red-400', icon: <ShieldAlert className="w-4 h-4" /> },
};

function BucketSection({
  bucket,
  items,
  t,
  lang,
  onPrepare,
}: {
  bucket: Bucket;
  items: Item[];
  t: (typeof T)['es'];
  lang: 'es' | 'en';
  onPrepare: (id: string) => void;
}) {
  const s = BUCKET_STYLE[bucket];
  const title = bucket === 'worth' ? t.worth : bucket === 'discard' ? t.discard : t.scam;
  return (
    <div>
      <p className={`flex items-center gap-1.5 text-[12px] font-black uppercase tracking-wider mb-2 ${s.label}`}>
        {s.icon} {title} · {items.length}
      </p>
      <ul className="space-y-2.5">
        {items.map((it) => {
          const ev = it.ev!;
          const v = ev.verdict;
          const vColor = v === 'apply' ? 'text-green-500' : v === 'maybe' ? 'text-amber-500' : 'text-red-500';
          return (
            <li key={it.id} className={`rounded-2xl bg-zinc-50 dark:bg-white/5 border ${s.ring} px-4 py-3`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {[ev.role, ev.company].filter(Boolean).join(' · ') || it.text.slice(0, 60)}
                  </p>
                  <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
                    {t.verdict[v]}
                    {ev.duplicate && (
                      <span className="inline-flex items-center gap-1 ml-2 text-violet-500">
                        <CopyCheck className="w-3 h-3" /> {t.dupNote} ({ev.duplicate.similarity}%)
                      </span>
                    )}
                    {bucket === 'scam' && ev.firewall && (
                      <span className="ml-2 text-red-500">· {ev.firewall.flags.length} señal(es)</span>
                    )}
                  </p>
                </div>
                <span className={`text-2xl font-black tracking-tighter shrink-0 ${vColor}`}>{ev.score}</span>
              </div>

              {bucket === 'worth' && (
                <div className="mt-3">
                  {it.prepared ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" /> {t.preparedOk} · {t.match}: {it.prepared.match}
                      </span>
                      <a
                        href={`/${lang}/herramientas/cv?cv=${it.prepared.cvId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-black text-[12px] font-bold hover:brightness-105 transition"
                      >
                        <FileText className="w-3.5 h-3.5" /> {t.openCV}
                      </a>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onPrepare(it.id)}
                        disabled={it.preparing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-black text-[12.5px] font-black hover:brightness-105 active:scale-[0.98] disabled:opacity-60 transition"
                      >
                        {it.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {it.preparing ? t.preparing : t.prepare}
                      </button>
                      {it.prepareErr && <p className="text-[12px] text-red-500 mt-1.5">{it.prepareErr}</p>}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
