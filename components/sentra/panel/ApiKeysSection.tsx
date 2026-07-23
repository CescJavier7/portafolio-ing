'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, Copy, Check, X, Terminal, Lock, Webhook as WebhookIcon, RefreshCw } from 'lucide-react';
import {
  sentraCreateApiKey,
  sentraListApiKeys,
  sentraRevokeApiKey,
  sentraListWebhooks,
  sentraCreateWebhook,
  sentraToggleWebhook,
  sentraRegenerateWebhookSecret,
  sentraDeleteWebhook,
  SentraApiError,
  type SentraApiKey,
  type SentraApiKeyCreated,
  type SentraWebhook,
  type SentraWebhookCreated,
  type SentraUser,
} from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface WebhooksDict {
  title: string;
  intro: string;
  urlPlaceholder: string;
  eventScanCompleted: string;
  eventMonitoringAlert: string;
  eventExposureAlert: string;
  create: string;
  creating: string;
  empty: string;
  emptyNoneYet: string;
  created: string;
  secretLabel: string;
  never: string;
  lastTriggered: string;
  lastStatus: string;
  enabled: string;
  disabled: string;
  regenerate: string;
  delete: string;
  lockedCta: string;
}

export interface ApiKeysDict {
  title: string;
  subtitle: string;
  intro: string;
  namePlaceholder: string;
  create: string;
  creating: string;
  empty: string;
  emptyNoneYet: string;
  created: string;
  never: string;
  lastUsed: string;
  copy: string;
  copied: string;
  close: string;
  revoke: string;
  revoked: string;
  docsTitle: string;
  docsGateTitle: string;
  docsGateBody: string;
  docsCiTitle: string;
  docsCiBody: string;
  lockedTitle: string;
  lockedBody: string;
  lockedCta: string;
  webhooks: WebhooksDict;
}

const EVENT_TYPES = ['scan_completed', 'monitoring_alert', 'exposure_alert'] as const;

function WebhooksBlock({
  dict,
  hasAccess,
  onUpgrade,
}: {
  dict: WebhooksDict;
  hasAccess: boolean;
  onUpgrade: () => void;
}) {
  const [hooks, setHooks] = useState<SentraWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['scan_completed']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<SentraWebhookCreated | null>(null);
  const [copied, setCopied] = useState(false);

  function reload() {
    sentraListWebhooks()
      .then(setHooks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  function eventLabel(e: string): string {
    if (e === 'scan_completed') return dict.eventScanCompleted;
    if (e === 'monitoring_alert') return dict.eventMonitoringAlert;
    return dict.eventExposureAlert;
  }

  function toggleEvent(e: string) {
    setEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (events.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const hook = await sentraCreateWebhook(url, events);
      setJustCreated(hook);
      setHooks((prev) => [hook, ...prev]);
      setUrl('');
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) onUpgrade();
      else setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, enabled: boolean) {
    setHooks((prev) => prev.map((h) => (h.id === id ? { ...h, enabled } : h)));
    try {
      await sentraToggleWebhook(id, enabled);
    } catch {
      reload();
    }
  }

  async function regenerate(id: string) {
    try {
      const updated = await sentraRegenerateWebhookSecret(id);
      setJustCreated(updated);
      setHooks((prev) => prev.map((h) => (h.id === id ? updated : h)));
    } catch {
      reload();
    }
  }

  async function remove(id: string) {
    setHooks((prev) => prev.filter((h) => h.id !== id));
    try {
      await sentraDeleteWebhook(id);
    } catch {
      reload();
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <WebhookIcon className="w-5 h-5 text-green-500" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{dict.title}</h2>
      </div>
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5 max-w-2xl">{dict.intro}</p>

      <form onSubmit={create} className="space-y-3 mb-6">
        <input
          type="url"
          required
          placeholder={dict.urlPlaceholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
        />
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map((e) => (
            <label
              key={e}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold cursor-pointer transition-colors ${
                events.includes(e)
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
                  : 'bg-white dark:bg-zinc-900/60 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <input
                type="checkbox"
                checked={events.includes(e)}
                onChange={() => toggleEvent(e)}
                className="hidden"
              />
              {eventLabel(e)}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy || events.length === 0}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> {busy ? dict.creating : dict.create}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>}

      {justCreated && (
        <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/25 p-5 mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{dict.created}</p>
            <button onClick={() => setJustCreated(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">{dict.secretLabel}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-lg bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[13px] font-mono text-zinc-800 dark:text-zinc-200">
              {justCreated.secret}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(justCreated.secret);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-4">…</p>
      ) : hooks.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {hasAccess ? dict.emptyNoneYet : dict.empty}
          </p>
          {!hasAccess && (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> {dict.lockedCta}
            </button>
          )}
        </div>
      ) : (
        <ul className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          {hooks.map((h) => (
            <li key={h.id} className="px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{h.url}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    {h.event_types.map(eventLabel).join(' · ')}
                  </p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                    {dict.lastTriggered}: {h.last_triggered_at ? new Date(h.last_triggered_at).toLocaleString() : dict.never}
                    {h.last_status_code !== null && ` · ${dict.lastStatus}: ${h.last_status_code}`}
                  </p>
                </div>
                <button
                  onClick={() => toggle(h.id, !h.enabled)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border transition-colors ${
                    h.enabled
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  {h.enabled ? dict.enabled : dict.disabled}
                </button>
                <button
                  onClick={() => regenerate(h.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 hover:border-green-400 hover:text-green-500 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> {dict.regenerate}
                </button>
                <button
                  onClick={() => remove(h.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {dict.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CodeBlock({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
      >
        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        {copied ? copiedLabel : copyLabel}
      </button>
      <pre className="text-[12.5px] font-mono text-zinc-300 overflow-x-auto leading-relaxed pr-20">{code}</pre>
    </div>
  );
}

export default function ApiKeysSection({
  dict,
  user,
  onUpgrade,
}: {
  dict: ApiKeysDict;
  user: SentraUser;
  onUpgrade: () => void;
}) {
  const [keys, setKeys] = useState<SentraApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<SentraApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  // FREE es el único plan sin acceso a API/Webhooks (ver core/plans.py en
  // el backend): un usuario Pro con la lista vacía (ej. borró todo) NO debe
  // ver el mensaje de "mejora tu plan", solo alguien realmente sin acceso.
  const hasAccess = user.plan !== 'FREE';

  useEffect(() => {
    sentraListApiKeys()
      .then(setKeys)
      .catch((err) => {
        // 402 aquí significa plan FREE: no es un error, es el estado "sin acceso".
        if (!(err instanceof SentraApiError && err.status === 402)) {
          /* deja la lista vacía en silencio para otros errores transitorios */
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const key = await sentraCreateApiKey(name);
      setJustCreated(key);
      setKeys((prev) => [key, ...prev]);
      setName('');
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) onUpgrade();
      else setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
    try {
      await sentraRevokeApiKey(id);
    } catch {
      sentraListApiKeys().then(setKeys).catch(() => {});
    }
  }

  return (
    <div>
      <SectionHeader icon={<KeyRound className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5 max-w-2xl">{dict.intro}</p>

      <form onSubmit={create} className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          required
          placeholder={dict.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          <Plus className="w-4 h-4" /> {busy ? dict.creating : dict.create}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>}

      {/* Revelado único de la key recién creada */}
      {justCreated && (
        <div className="rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/25 p-5 mb-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{dict.created}</p>
            <button onClick={() => setJustCreated(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate rounded-lg bg-zinc-100 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-[13px] font-mono text-zinc-800 dark:text-zinc-200">
              {justCreated.key}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(justCreated.key);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? dict.copied : dict.copy}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-4">…</p>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 text-center mb-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            {hasAccess ? dict.emptyNoneYet : dict.empty}
          </p>
          {!hasAccess && (
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> {dict.lockedCta}
            </button>
          )}
        </div>
      ) : (
        <ul className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden mb-8">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{k.name}</p>
                <p className="text-[12px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {k.key_prefix}••••••••
                </p>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  {dict.lastUsed}: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : dict.never}
                </p>
              </div>
              {k.revoked ? (
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">{dict.revoked}</span>
              ) : (
                <button
                  onClick={() => revoke(k.id)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 hover:border-red-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {dict.revoke}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Documentación: lo que hace de esto "infraestructura" es que se
          pueda integrar sin hablar con nadie. */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-zinc-950 dark:bg-black border border-zinc-800 p-5">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
            <Terminal className="w-3.5 h-3.5" /> {dict.docsTitle}
          </p>
          <CodeBlock
            copyLabel={dict.copy}
            copiedLabel={dict.copied}
            code={`curl -H "Authorization: Bearer sentra_..." \\
  https://api.cescjavier.dev/api/v1/public/domains/tudominio.com/score

curl -H "Authorization: Bearer sentra_..." \\
  https://api.cescjavier.dev/api/v1/public/domains/tudominio.com/findings`}
          />
        </div>

        <div className="rounded-2xl bg-zinc-950 dark:bg-black border border-zinc-800 p-5">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            <Terminal className="w-3.5 h-3.5" /> {dict.docsGateTitle}
          </p>
          <p className="text-[12px] text-zinc-500 mb-3">{dict.docsGateBody}</p>
          <CodeBlock
            copyLabel={dict.copy}
            copiedLabel={dict.copied}
            code={`#!/bin/bash
# sentra-gate.sh — falla el pipeline si el score baja del umbral.
DOMAIN="tudominio.com"
MIN_SCORE=80

RESULT=$(curl -s -H "Authorization: Bearer $SENTRA_API_KEY" \\
  "https://api.cescjavier.dev/api/v1/public/domains/$DOMAIN/gate?min_score=$MIN_SCORE")

PASSED=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['passed'])")

echo "$RESULT"
if [ "$PASSED" != "True" ]; then
  echo "Security gate FAILED: score por debajo de $MIN_SCORE"
  exit 1
fi
echo "Security gate OK"`}
          />
        </div>

        <div className="rounded-2xl bg-zinc-950 dark:bg-black border border-zinc-800 p-5">
          <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
            <Terminal className="w-3.5 h-3.5" /> {dict.docsCiTitle}
          </p>
          <p className="text-[12px] text-zinc-500 mb-3">{dict.docsCiBody}</p>
          <CodeBlock
            copyLabel={dict.copy}
            copiedLabel={dict.copied}
            code={`# .github/workflows/security-gate.yml
name: Sentra Security Gate
on: [push]
jobs:
  security-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Check Sentra Security Score
        env:
          SENTRA_API_KEY: \${{ secrets.SENTRA_API_KEY }}
        run: |
          chmod +x ./sentra-gate.sh
          ./sentra-gate.sh`}
          />
        </div>
      </div>

      <WebhooksBlock dict={dict.webhooks} hasAccess={hasAccess} onUpgrade={onUpgrade} />
    </div>
  );
}
