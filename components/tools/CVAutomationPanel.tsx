'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Rocket, Zap, Copy, Check, KeyRound, ArrowUpRight, ChevronDown, Plus, Trash2, Loader2, Briefcase, Terminal, Target, Filter,
} from 'lucide-react';
import {
  sentraGenerateCV,
  sentraEvaluateOffer,
  sentraCreateApplication,
  SentraApiError,
} from '@/lib/sentra/api';

const ENDPOINT = 'https://api.cescjavier.dev/api/v1/public/cv/generate';

const CURL = `curl -X POST ${ENDPOINT} \\
  -H "Authorization: Bearer TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "profile_text": "Tu perfil / CV en texto…",
    "job_posting": "La descripción de la vacante…"
  }'`;

const N8N_WORKFLOW = JSON.stringify(
  {
    name: 'Sentra CV AI → Notion',
    nodes: [
      { parameters: {}, id: 'trigger', name: 'Inicio', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [240, 300] },
      {
        parameters: {
          method: 'POST',
          url: ENDPOINT,
          sendHeaders: true,
          headerParameters: { parameters: [{ name: 'Authorization', value: 'Bearer TU_API_KEY' }] },
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={\n  "profile_text": "{{ $json.profile_text }}",\n  "job_posting": "{{ $json.job_posting }}"\n}',
          options: {},
        },
        id: 'sentra', name: 'Sentra CV AI', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [480, 300],
      },
      {
        parameters: { resource: 'databasePage', operation: 'create', databaseId: 'TU_DATABASE_DE_NOTION', title: '={{ $json.full_name }} — {{ $json.match_score }}%' },
        id: 'notion', name: 'Guardar en Notion', type: 'n8n-nodes-base.notion', typeVersion: 2.2, position: [720, 300],
      },
    ],
    connections: {
      Inicio: { main: [[{ node: 'Sentra CV AI', type: 'main', index: 0 }]] },
      'Sentra CV AI': { main: [[{ node: 'Guardar en Notion', type: 'main', index: 0 }]] },
    },
  },
  null,
  2
);

const MAX_POSTINGS = 8;

const T = {
  es: {
    tag: 'Automatización',
    title: 'Postula en piloto automático',
    intro: 'Pega tu perfil una vez y varias ofertas. Sentra genera un CV a medida para cada una y las guarda solas en tus Postulaciones. Sin abrir Notion, sin montar nada.',
    proPill: 'Requiere Pro',
    profileLabel: 'Tu perfil / CV (una sola vez)',
    profilePh: 'Pega tu experiencia, o el texto de tu CV actual…',
    postingsLabel: 'Ofertas a las que postular',
    postingPh: 'Pega aquí la descripción de una vacante…',
    addPosting: 'Agregar otra oferta',
    run: 'Evaluar, filtrar y postular',
    running: 'Trabajando…',
    progress: (i: number, n: number) => `Procesando ${i} de ${n}…`,
    doneMsg: (gen: number, disc: number, fail: number, avg: number) =>
      `Sentra evaluó ${gen + disc + fail} ofertas · descartó ${disc} por score bajo · preparó ${gen}` +
      (gen ? ` (score promedio ${avg})` : '') +
      (fail ? ` · ${fail} fallaron` : '') + '. Están en tus Postulaciones.',
    viewApps: 'Ver mis postulaciones',
    needProfile: 'Pega tu perfil y al menos una oferta.',
    genericErr: 'No se pudo completar. Inténtalo de nuevo.',
    fallbackCompany: 'Empresa',
    fallbackRole: 'Puesto',
    gateLabel: 'Descartar ofertas con score menor a',
    gateHint: 'El score usa tu Objetivo. Configúralo para mejores decisiones.',
    configTarget: 'Configurar mi Objetivo',
    upsellTitle: 'La postulación en lote es Pro',
    upsellBody: 'Genera CVs a medida para varias vacantes de una y síguelas todas en tu cuenta. Desbloquéalo con el plan Pro ($10/mes, todo incluido).',
    upsellCta: 'Desbloquear con Pro',
    devTitle: 'Para desarrolladores: API + n8n',
    devIntro: 'Si prefieres tu propio flujo (n8n / script), el mismo motor está por API con tu API key.',
    endpointLabel: 'Endpoint',
    curlLabel: 'Ejemplo con cURL',
    n8nLabel: 'Workflow de n8n (importar)',
    n8nHint: 'En n8n: Workflows → ⋯ → "Import from clipboard". Cambia TU_API_KEY y el database de Notion.',
    copy: 'Copiar',
    copied: 'Copiado',
    apiKeyCta: 'Crear mi API key',
    apiKeyNote: 'Se genera desde tu panel de Sentra → API Keys.',
    show: 'Mostrar',
    hide: 'Ocultar',
    noScrape: 'No scrapeamos LinkedIn (viola sus términos). Tú controlas tus datos y tu perfil.',
  },
  en: {
    tag: 'Automation',
    title: 'Apply on autopilot',
    intro: 'Paste your profile once and several job postings. Sentra tailors a CV for each and saves them all into your Applications. No Notion, no setup.',
    proPill: 'Pro required',
    profileLabel: 'Your profile / CV (once)',
    profilePh: 'Paste your experience, or your current CV text…',
    postingsLabel: 'Jobs to apply to',
    postingPh: 'Paste a job posting here…',
    addPosting: 'Add another posting',
    run: 'Evaluate, filter & apply',
    running: 'Working…',
    progress: (i: number, n: number) => `Processing ${i} of ${n}…`,
    doneMsg: (gen: number, disc: number, fail: number, avg: number) =>
      `Sentra evaluated ${gen + disc + fail} jobs · discarded ${disc} for low score · prepared ${gen}` +
      (gen ? ` (avg score ${avg})` : '') +
      (fail ? ` · ${fail} failed` : '') + '. They are in your Applications.',
    viewApps: 'View my applications',
    needProfile: 'Paste your profile and at least one posting.',
    genericErr: 'Could not complete. Please try again.',
    fallbackCompany: 'Company',
    fallbackRole: 'Role',
    gateLabel: 'Discard jobs scoring below',
    gateHint: 'The score uses your Target. Configure it for better decisions.',
    configTarget: 'Set up my Target',
    upsellTitle: 'Batch apply is Pro',
    upsellBody: 'Tailor CVs for several jobs at once and track them all in your account. Unlock it with Pro ($10/mo, all included).',
    upsellCta: 'Unlock with Pro',
    devTitle: 'For developers: API + n8n',
    devIntro: 'Prefer your own flow (n8n / script)? The same engine is available via API with your API key.',
    endpointLabel: 'Endpoint',
    curlLabel: 'cURL example',
    n8nLabel: 'n8n workflow (import)',
    n8nHint: 'In n8n: Workflows → ⋯ → "Import from clipboard". Change TU_API_KEY and the Notion database.',
    copy: 'Copy',
    copied: 'Copied',
    apiKeyCta: 'Create my API key',
    apiKeyNote: 'Generated from your Sentra panel → API Keys.',
    show: 'Show',
    hide: 'Hide',
    noScrape: 'We do not scrape LinkedIn (it violates their terms). You control your data and your profile.',
  },
};

function CopyButton({ text, label, copied }: { text: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-green-500 transition-colors"
    >
      {done ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? copied : label}
    </button>
  );
}

export default function CVAutomationPanel({
  lang,
  plan,
  defaultProfile = '',
  onViewApplications,
  onConfigureTarget,
}: {
  lang: 'es' | 'en';
  plan?: string;
  defaultProfile?: string;
  onViewApplications?: () => void;
  onConfigureTarget?: () => void;
}) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const isPro = plan === 'PRO' || plan === 'TEAM' || plan === 'ENTERPRISE';

  const [profile, setProfile] = useState(defaultProfile);
  const [postings, setPostings] = useState<string[]>(['']);
  const [threshold, setThreshold] = useState(65);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [n8nOpen, setN8nOpen] = useState(false);

  const setPosting = (i: number, v: string) => setPostings((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addPosting = () => setPostings((p) => (p.length >= MAX_POSTINGS ? p : [...p, '']));
  const removePosting = (i: number) => setPostings((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));

  async function runBatch() {
    const valid = postings.map((p) => p.trim()).filter((p) => p.length >= 30);
    if (profile.trim().length < 30 || valid.length === 0) {
      setError(t.needProfile);
      return;
    }
    setError(null);
    setResultMsg(null);
    setRunning(true);
    let generated = 0;
    let discarded = 0;
    let failed = 0;
    let scoreSum = 0;
    for (let i = 0; i < valid.length; i++) {
      setProgress({ done: i, total: valid.length });
      try {
        // 1) EVALUAR (barato, rules-first): decide si vale la pena antes de gastar la generación.
        const ev = await sentraEvaluateOffer(valid[i]);
        if (ev.score < threshold) {
          discarded++;
          continue; // basura → ni se genera el CV
        }
        // 2) Solo las buenas: generar CV + registrar postulación con su score.
        const cv = await sentraGenerateCV({ profile_text: profile.trim(), job_posting: valid[i] });
        await sentraCreateApplication({
          company: ev.company || t.fallbackCompany,
          role: ev.role || t.fallbackRole,
          cv_document_id: cv.id,
          score: ev.score,
        });
        generated++;
        scoreSum += ev.score;
      } catch (err) {
        failed++;
        if (err instanceof SentraApiError && err.status === 402) break; // sin cuota → detener
      }
    }
    setProgress({ done: valid.length, total: valid.length });
    const avg = generated ? Math.round(scoreSum / generated) : 0;
    setResultMsg(t.doneMsg(generated, discarded, failed, avg));
    setRunning(false);
  }

  const inputCls =
    'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition resize-y';

  return (
    <div className="mt-14 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="relative p-6 md:p-8 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-green-600 dark:text-green-400" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-green-700 dark:text-green-400">{t.tag}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-3 h-3" /> {t.proPill}
          </span>
        </div>
        <h3 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">{t.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">{t.intro}</p>
      </div>

      <div className="p-6 md:p-8">
        {!isPro ? (
          /* Upsell: la automatización en lote es el valor de pago */
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mb-4">
              <Rocket className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h4 className="text-base font-black text-zinc-900 dark:text-white mb-1.5">{t.upsellTitle}</h4>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">{t.upsellBody}</p>
            <Link
              href={`/${lang}/sentinel/precios`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Zap className="w-4 h-4" /> {t.upsellCta} <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          /* Postulación en lote (Pro) */
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">{t.profileLabel}</label>
              <textarea value={profile} onChange={(e) => setProfile(e.target.value)} placeholder={t.profilePh} rows={4} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                {t.postingsLabel} ({postings.length}/{MAX_POSTINGS})
              </label>
              <div className="space-y-2">
                {postings.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <textarea value={p} onChange={(e) => setPosting(i, e.target.value)} placeholder={t.postingPh} rows={2} className={inputCls} />
                    {postings.length > 1 && (
                      <button onClick={() => removePosting(i)} disabled={running} className="shrink-0 self-start mt-1 p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {postings.length < MAX_POSTINGS && (
                <button onClick={addPosting} disabled={running} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline disabled:opacity-40">
                  <Plus className="w-4 h-4" /> {t.addPosting}
                </button>
              )}
            </div>

            {/* Umbral de auto-descarte (el "menos aplicaciones basura") */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200">
                <Filter className="w-4 h-4 text-green-500" /> {t.gateLabel}
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                disabled={running}
                className="w-16 rounded-lg bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm font-bold text-center text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
              <span className="text-[12px] text-zinc-400 dark:text-zinc-500 basis-full sm:basis-auto flex items-center gap-2">
                {t.gateHint}
                {onConfigureTarget && (
                  <button onClick={onConfigureTarget} className="inline-flex items-center gap-1 font-semibold text-green-600 dark:text-green-400 hover:underline">
                    <Target className="w-3.5 h-3.5" /> {t.configTarget}
                  </button>
                )}
              </span>
            </div>

            {error && <p className="text-[13px] text-red-500">{error}</p>}

            {resultMsg ? (
              <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="text-[13px] text-zinc-700 dark:text-zinc-200 flex-1">
                  <Check className="w-4 h-4 text-green-500 inline mr-1" /> {resultMsg}
                </p>
                {onViewApplications && (
                  <button onClick={onViewApplications} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500 text-black text-[13px] font-bold hover:scale-[1.02] transition-transform">
                    <Briefcase className="w-4 h-4" /> {t.viewApps}
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={runBatch}
                disabled={running}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                {running && progress ? t.progress(progress.done + 1, progress.total) : t.run}
              </button>
            )}
          </div>
        )}

        {/* ── Sección avanzada: API + n8n (colapsable) ── */}
        <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <button onClick={() => setDevOpen((o) => !o)} className="w-full flex items-center justify-between text-left">
            <span className="inline-flex items-center gap-2 text-[13px] font-bold text-zinc-700 dark:text-zinc-200">
              <Terminal className="w-4 h-4 text-zinc-400" /> {t.devTitle}
            </span>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${devOpen ? 'rotate-180' : ''}`} />
          </button>

          {devOpen && (
            <div className="mt-5 space-y-5">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">{t.devIntro}</p>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.endpointLabel}</span>
                  <CopyButton text={ENDPOINT} label={t.copy} copied={t.copied} />
                </div>
                <code className="block rounded-xl bg-zinc-900 dark:bg-black border border-zinc-800 px-4 py-3 text-[12.5px] font-mono text-green-300 overflow-x-auto cv-scroll">
                  POST {ENDPOINT}
                </code>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.curlLabel}</span>
                  <CopyButton text={CURL} label={t.copy} copied={t.copied} />
                </div>
                <pre className="rounded-xl bg-zinc-900 dark:bg-black border border-zinc-800 px-4 py-3 text-[12px] font-mono text-zinc-200 overflow-x-auto cv-scroll whitespace-pre">
                  {CURL}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <button onClick={() => setN8nOpen((o) => !o)} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-green-500">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${n8nOpen ? 'rotate-180' : ''}`} /> {t.n8nLabel}
                  </button>
                  <CopyButton text={N8N_WORKFLOW} label={t.copy} copied={t.copied} />
                </div>
                {n8nOpen && (
                  <>
                    <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-2">{t.n8nHint}</p>
                    <pre className="rounded-xl bg-zinc-900 dark:bg-black border border-zinc-800 px-4 py-3 text-[11.5px] font-mono text-zinc-300 overflow-x-auto cv-scroll max-h-72 whitespace-pre">
                      {N8N_WORKFLOW}
                    </pre>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <Link href={`/${lang}/sentinel/panel`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
                  <KeyRound className="w-4 h-4" /> {t.apiKeyCta}
                </Link>
                <p className="text-[12px] text-zinc-400 dark:text-zinc-500">{t.apiKeyNote}</p>
              </div>

              <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 leading-relaxed">{t.noScrape}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
