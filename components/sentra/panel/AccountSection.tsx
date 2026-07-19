'use client';

import { useState } from 'react';
import { UserCog } from 'lucide-react';
import { sentraUpdateProfile, SentraApiError, type SentraUser } from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface AccountDict {
  title: string;
  subtitle: string;
  profileTitle: string;
  nameLabel: string;
  namePlaceholder: string;
  nameHint: string;
  orgLabel: string;
  orgHintOwner: string;
  orgHintMember: string;
  emailLabel: string;
  save: string;
  saving: string;
  saved: string;
}

const inputClass =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition disabled:opacity-60 disabled:cursor-not-allowed';

// La sección de Cuenta compone el formulario de perfil (nombre + empresa)
// con las tarjetas existentes de Plan y Seguridad, que se inyectan como
// children desde el shell para no duplicar su lógica.
export default function AccountSection({
  dict,
  user,
  onUpdated,
  children,
}: {
  dict: AccountDict;
  user: SentraUser;
  onUpdated: (u: SentraUser) => void;
  children?: React.ReactNode;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [org, setOrg] = useState(user.organization_name ?? '');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user.role === 'OWNER';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      const payload: { name?: string | null; organization_name?: string } = { name: name.trim() || null };
      if (isOwner && org.trim()) payload.organization_name = org.trim();
      const updated = await sentraUpdateProfile(payload);
      onUpdated(updated);
      setOk(true);
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader icon={<UserCog className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />

      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8">
        <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white mb-6">{dict.profileTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              {dict.emailLabel}
            </label>
            <input type="email" value={user.email} disabled className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              {dict.nameLabel}
            </label>
            <input
              type="text"
              maxLength={120}
              placeholder={dict.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{dict.nameHint}</p>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
              {dict.orgLabel}
            </label>
            <input
              type="text"
              minLength={2}
              maxLength={120}
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              disabled={!isOwner}
              className={inputClass}
            />
            <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
              {isOwner ? dict.orgHintOwner : dict.orgHintMember}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
          )}
          {ok && (
            <p className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              {dict.saved}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
          >
            {busy ? dict.saving : dict.save}
          </button>
        </form>
      </div>

      {/* Plan y Seguridad, inyectados desde el shell. */}
      {children}
    </div>
  );
}
