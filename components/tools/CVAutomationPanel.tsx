'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Workflow, Zap, Copy, Check, KeyRound, ArrowUpRight, ChevronDown } from 'lucide-react';

// Panel de AUTOMATIZACIÓN de Sentra CV AI. Expone el motor por API (auth con
// API key de Sentra) para que un flujo de n8n genere y adapte CVs solo, y los
// guarde en Notion / los registre como postulaciones. Decisión de ingeniería:
// NO scraping de LinkedIn (ToS/bans); el usuario dispara su propio n8n con SU
// key, con datos que él controla. Endpoint: POST /api/v1/public/cv/generate.

const ENDPOINT = 'https://api.cescjavier.dev/api/v1/public/cv/generate';

const CURL = `curl -X POST ${ENDPOINT} \\
  -H "Authorization: Bearer TU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "profile_text": "Tu perfil / CV en texto…",
    "job_posting": "La descripción de la vacante…"
  }'`;

// Workflow de n8n listo para importar (Workflows → ⋯ → Import from clipboard).
const N8N_WORKFLOW = JSON.stringify(
  {
    name: 'Sentra CV AI → Notion',
    nodes: [
      {
        parameters: {},
        id: 'trigger',
        name: 'Inicio',
        type: 'n8n-nodes-base.manualTrigger',
        typeVersion: 1,
        position: [240, 300],
      },
      {
        parameters: {
          method: 'POST',
          url: ENDPOINT,
          sendHeaders: true,
          headerParameters: {
            parameters: [{ name: 'Authorization', value: 'Bearer TU_API_KEY' }],
          },
          sendBody: true,
          specifyBody: 'json',
          jsonBody:
            '={\n  "profile_text": "{{ $json.profile_text }}",\n  "job_posting": "{{ $json.job_posting }}"\n}',
          options: {},
        },
        id: 'sentra',
        name: 'Sentra CV AI',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [480, 300],
      },
      {
        parameters: {
          resource: 'databasePage',
          operation: 'create',
          databaseId: 'TU_DATABASE_DE_NOTION',
          title: '={{ $json.full_name }} — {{ $json.match_score }}%',
        },
        id: 'notion',
        name: 'Guardar en Notion',
        type: 'n8n-nodes-base.notion',
        typeVersion: 2.2,
        position: [720, 300],
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

const T = {
  es: {
    tag: 'Automatización',
    title: 'Postula en piloto automático',
    intro:
      'El mismo motor que adapta tu CV, ahora por API. Conéctalo a n8n (o a tu propio script) para generar CVs a medida de cada vacante y registrarlos en Notion o en tu seguimiento de postulaciones — sin abrir la app.',
    proPill: 'Requiere Pro',
    steps: [
      { t: 'Crea una API key', d: 'En tu panel de Sentra → API Keys. Es tu credencial de máquina (no tu contraseña).' },
      { t: 'Llama al endpoint', d: 'POST con tu perfil y la oferta. Recibes el CV ya adaptado en JSON, con match score y sugerencias.' },
      { t: 'Conéctalo a Notion', d: 'Enruta la respuesta a Notion (o a tu tracker) para guardar cada CV y postular en cadena.' },
    ],
    endpointLabel: 'Endpoint',
    curlLabel: 'Ejemplo con cURL',
    n8nLabel: 'Workflow de n8n (importar)',
    n8nHint: 'En n8n: Workflows → ⋯ → “Import from clipboard”. Cambia TU_API_KEY y el database de Notion.',
    copy: 'Copiar',
    copied: 'Copiado',
    ctaKeyPro: 'Crear mi API key',
    ctaKeyFree: 'Desbloquear con Pro',
    ctaKeyNote: 'La API key se genera y gestiona desde tu panel de Sentra.',
    show: 'Ver workflow',
    hide: 'Ocultar workflow',
    noScrape:
      'Nota de ingeniería: no scrapeamos LinkedIn (viola sus términos y te arriesga a un baneo). Tú disparas tu propio flujo, con tu key y tus datos.',
  },
  en: {
    tag: 'Automation',
    title: 'Apply on autopilot',
    intro:
      'The same engine that tailors your résumé, now over an API. Wire it to n8n (or your own script) to generate a CV per job posting and log it to Notion or your application tracker — without opening the app.',
    proPill: 'Pro required',
    steps: [
      { t: 'Create an API key', d: 'In your Sentra panel → API Keys. It is your machine credential (not your password).' },
      { t: 'Call the endpoint', d: 'POST your profile and the job posting. You get the tailored CV as JSON, with match score and suggestions.' },
      { t: 'Wire it to Notion', d: 'Route the response to Notion (or your tracker) to store each CV and apply in sequence.' },
    ],
    endpointLabel: 'Endpoint',
    curlLabel: 'cURL example',
    n8nLabel: 'n8n workflow (import)',
    n8nHint: 'In n8n: Workflows → ⋯ → “Import from clipboard”. Change TU_API_KEY and the Notion database.',
    copy: 'Copy',
    copied: 'Copied',
    ctaKeyPro: 'Create my API key',
    ctaKeyFree: 'Unlock with Pro',
    ctaKeyNote: 'The API key is generated and managed from your Sentra panel.',
    show: 'Show workflow',
    hide: 'Hide workflow',
    noScrape:
      'Engineering note: we do not scrape LinkedIn (it violates their terms and risks a ban). You trigger your own flow, with your key and your data.',
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

export default function CVAutomationPanel({ lang, plan }: { lang: 'es' | 'en'; plan?: string }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const isPro = plan === 'PRO' || plan === 'TEAM' || plan === 'ENTERPRISE';
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-14 rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      {/* Cabecera */}
      <div className="relative p-6 md:p-8 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/25 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-green-600 dark:text-green-400" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-green-700 dark:text-green-400">{t.tag}</span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-3 h-3" /> {t.proPill}
          </span>
        </div>
        <h3 className="text-xl md:text-2xl font-black tracking-tight text-zinc-900 dark:text-white mb-2">{t.title}</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">{t.intro}</p>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        {/* Pasos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {t.steps.map((s, i) => (
            <div key={s.t} className="rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 p-4">
              <span className="inline-flex w-6 h-6 rounded-full bg-green-500 text-black text-[12px] font-black items-center justify-center mb-2">
                {i + 1}
              </span>
              <p className="text-[13.5px] font-bold text-zinc-900 dark:text-white mb-1">{s.t}</p>
              <p className="text-[12.5px] text-zinc-500 dark:text-zinc-400 leading-snug">{s.d}</p>
            </div>
          ))}
        </div>

        {/* Endpoint */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.endpointLabel}</span>
            <CopyButton text={ENDPOINT} label={t.copy} copied={t.copied} />
          </div>
          <code className="block rounded-xl bg-zinc-900 dark:bg-black border border-zinc-800 px-4 py-3 text-[12.5px] font-mono text-green-300 overflow-x-auto cv-scroll">
            POST {ENDPOINT}
          </code>
        </div>

        {/* cURL */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t.curlLabel}</span>
            <CopyButton text={CURL} label={t.copy} copied={t.copied} />
          </div>
          <pre className="rounded-xl bg-zinc-900 dark:bg-black border border-zinc-800 px-4 py-3 text-[12px] font-mono text-zinc-200 overflow-x-auto cv-scroll whitespace-pre">
            {CURL}
          </pre>
        </div>

        {/* n8n workflow (colapsable) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-green-500"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              {t.n8nLabel}
            </button>
            <CopyButton text={N8N_WORKFLOW} label={t.copy} copied={t.copied} />
          </div>
          {open && (
            <>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400 mb-2">{t.n8nHint}</p>
              <pre className="rounded-xl bg-zinc-900 dark:bg-black border border-zinc-800 px-4 py-3 text-[11.5px] font-mono text-zinc-300 overflow-x-auto cv-scroll max-h-72 whitespace-pre">
                {N8N_WORKFLOW}
              </pre>
            </>
          )}
        </div>

        {/* CTA + nota */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
          {isPro ? (
            <Link
              href={`/${lang}/sentinel/panel`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <KeyRound className="w-4 h-4" /> {t.ctaKeyPro}
            </Link>
          ) : (
            <Link
              href={`/${lang}/sentinel/precios`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Zap className="w-4 h-4" /> {t.ctaKeyFree} <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
          <p className="text-[12px] text-zinc-400 dark:text-zinc-500">{t.ctaKeyNote}</p>
        </div>

        <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-4 leading-relaxed">
          {t.noScrape}
        </p>
      </div>
    </div>
  );
}
