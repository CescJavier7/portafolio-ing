'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Lock } from 'lucide-react';
import {
  sentraListTeam,
  sentraInviteMember,
  sentraChangeRole,
  sentraRemoveMember,
  SentraApiError,
  type SentraTeamMember,
  type SentraUser,
} from '@/lib/sentra/api';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface TeamDict {
  title: string;
  subtitle: string;
  intro: string;
  emailPlaceholder: string;
  roleLabel: string;
  roleOwner: string;
  roleAdmin: string;
  roleAnalyst: string;
  roleMember: string;
  invite: string;
  inviting: string;
  invited: string;
  empty: string;
  pending: string;
  you: string;
  remove: string;
  cannotManage: string;
  lockedCta: string;
}

const inputClass =
  'flex-1 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50';

const ASSIGNABLE_ROLES = ['ADMIN', 'ANALYST', 'MEMBER'] as const;

export default function TeamSection({
  dict,
  user,
  onUpgrade,
}: {
  dict: TeamDict;
  user: SentraUser;
  onUpgrade: () => void;
}) {
  const [members, setMembers] = useState<SentraTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof ASSIGNABLE_ROLES)[number]>('MEMBER');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState(false);

  const canInvite = user.role === 'OWNER' || user.role === 'ADMIN';
  const canChangeRole = user.role === 'OWNER';

  function reload() {
    sentraListTeam()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  function roleLabel(r: string): string {
    if (r === 'OWNER') return dict.roleOwner;
    if (r === 'ADMIN') return dict.roleAdmin;
    if (r === 'ANALYST') return dict.roleAnalyst;
    return dict.roleMember;
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInvited(false);
    try {
      await sentraInviteMember(email, role);
      setInvited(true);
      setEmail('');
      reload();
    } catch (err) {
      if (err instanceof SentraApiError && err.status === 402) onUpgrade();
      else setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, newRole: string) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role: newRole } : m)));
    try {
      await sentraChangeRole(id, newRole);
    } catch {
      reload();
    }
  }

  async function remove(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    try {
      await sentraRemoveMember(id);
    } catch {
      reload();
    }
  }

  return (
    <div>
      <SectionHeader icon={<Users className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5 max-w-2xl">{dict.intro}</p>

      {canInvite ? (
        <form onSubmit={invite} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="email"
            required
            placeholder={dict.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as (typeof ASSIGNABLE_ROLES)[number])}
            className="rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            <UserPlus className="w-4 h-4" /> {busy ? dict.inviting : dict.invite}
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 mb-6">
          {dict.cannotManage}
        </p>
      )}

      {error && <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">{error}</p>}
      {invited && (
        <p className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-4">
          {dict.invited}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-4">…</p>
      ) : members.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{dict.empty}</p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" /> {dict.lockedCta}
          </button>
        </div>
      ) : (
        <ul className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          {members.map((m) => {
            const isSelf = m.id === user.id;
            const isOwner = m.role === 'OWNER';
            return (
              <li key={m.id} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {m.name || m.email}
                    {isSelf && <span className="ml-2 text-[11px] font-semibold text-green-600 dark:text-green-400">({dict.you})</span>}
                  </p>
                  <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">{m.email}</p>
                  {!m.email_verified && (
                    <p className="text-[11px] font-semibold text-amber-500 mt-1">{dict.pending}</p>
                  )}
                </div>

                {canChangeRole && !isSelf && !isOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    className="shrink-0 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-700 dark:text-zinc-300"
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    {roleLabel(m.role)}
                  </span>
                )}

                {canInvite && !isSelf && !isOwner && (
                  <button
                    onClick={() => remove(m.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 hover:border-red-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {dict.remove}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
