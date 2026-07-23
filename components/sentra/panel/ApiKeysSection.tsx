'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2, Copy, Check, X, Terminal, Lock } from 'lucide-react';
import {
  sentraCreateApiKey,
  sentraListApiKeys,
  sentraRevokeApiKey,
  SentraApiError,
  type SentraApiKey,
  type SentraApiKeyCreated,
} from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface ApiKeysDict {
  title: string;
  subtitle: string;
  intro: string;
  namePlaceholder: string;
  create: string;
  creating: string;
  empty: string;
  created: string;
  never: string;
  lastUsed: string;
  copy: string;
  copied: string;
  close: string;
  revoke: string;
  revoked: string;
  docsTitle: string;
  lockedTitle: string;
  lockedBody: string;
  lockedCta: string;
}

export default function ApiKeysSection({ dict, onUpgrade }: { dict: ApiKeysDict; onUpgrade: () => void }) {
  const [keys, setKeys] = useState<SentraApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<SentraApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

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
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{dict.empty}</p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" /> {dict.lockedCta}
          </button>
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

      {/* Documentación mínima: lo que hace de esto "infraestructura" es que
          se pueda integrar sin hablar con nadie. */}
      <div className="rounded-2xl bg-zinc-950 dark:bg-black border border-zinc-800 p-5">
        <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-zinc-400 mb-3">
          <Terminal className="w-3.5 h-3.5" /> {dict.docsTitle}
        </p>
        <pre className="text-[12.5px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
{`curl -H "Authorization: Bearer sentra_..." \\
  https://api.cescjavier.dev/api/v1/public/domains/tudominio.com/score

curl -H "Authorization: Bearer sentra_..." \\
  https://api.cescjavier.dev/api/v1/public/domains/tudominio.com/findings`}
        </pre>
      </div>
    </div>
  );
}
