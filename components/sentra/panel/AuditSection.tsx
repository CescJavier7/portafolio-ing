'use client';

import { useEffect, useState } from 'react';
import {
  ScrollText, UserPlus, UserMinus, ShieldCheck, Globe, Trash2, KeyRound,
  Webhook as WebhookIcon, Lock, Activity,
} from 'lucide-react';
import {
  sentraListAudit,
  SentraApiError,
  type SentraAuditEntry,
  type SentraUser,
} from '@/lib/sentra/api';
import { canManageTargets } from '@/lib/sentra/permissions';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

export interface AuditDict {
  title: string;
  subtitle: string;
  intro: string;
  filterAll: string;
  empty: string;
  loadMore: string;
  restricted: string;
  by: string;
  actions: {
    memberInvited: string;      // "invitó a {target} como {role}"
    memberRemoved: string;      // "eliminó a {target}"
    memberRoleChanged: string;  // "cambió el rol de {target} de {from} a {to}"
    targetCreated: string;      // "agregó el dominio {target}"
    targetDeleted: string;      // "eliminó el dominio {target}"
    apikeyCreated: string;      // "creó la API key {target}"
    apikeyRevoked: string;      // "revocó la API key {target}"
    webhookCreated: string;     // "creó un webhook hacia {target}"
    webhookDeleted: string;     // "eliminó el webhook hacia {target}"
    passwordChanged: string;    // "cambió su contraseña"
    unknown: string;            // "{action}"
  };
}

const PAGE = 30;

// Icono + color por familia de acción.
function actionVisual(action: string): { icon: React.ReactNode; color: string } {
  const g = 'text-green-500';
  switch (action) {
    case 'member.invited': return { icon: <UserPlus className="w-4 h-4" />, color: g };
    case 'member.removed': return { icon: <UserMinus className="w-4 h-4" />, color: 'text-red-500' };
    case 'member.role_changed': return { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-amber-500' };
    case 'target.created': return { icon: <Globe className="w-4 h-4" />, color: g };
    case 'target.deleted': return { icon: <Trash2 className="w-4 h-4" />, color: 'text-red-500' };
    case 'apikey.created': return { icon: <KeyRound className="w-4 h-4" />, color: g };
    case 'apikey.revoked': return { icon: <KeyRound className="w-4 h-4" />, color: 'text-red-500' };
    case 'webhook.created': return { icon: <WebhookIcon className="w-4 h-4" />, color: g };
    case 'webhook.deleted': return { icon: <WebhookIcon className="w-4 h-4" />, color: 'text-red-500' };
    case 'password.changed': return { icon: <Lock className="w-4 h-4" />, color: 'text-amber-500' };
    default: return { icon: <Activity className="w-4 h-4" />, color: 'text-zinc-400' };
  }
}

// Filtros ofrecidos en el selector (código -> etiqueta se toma del dict).
const FILTERABLE = [
  'member.invited', 'member.removed', 'member.role_changed',
  'target.created', 'target.deleted',
  'apikey.created', 'apikey.revoked',
  'webhook.created', 'webhook.deleted',
  'password.changed',
];

export default function AuditSection({ dict, user }: { dict: AuditDict; user: SentraUser }) {
  const allowed = canManageTargets(user.role); // OWNER/ADMIN, igual que el backend
  const [entries, setEntries] = useState<SentraAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [restricted, setRestricted] = useState(false);

  function load(reset: boolean) {
    const nextOffset = reset ? 0 : offset;
    setLoading(true);
    sentraListAudit({ action: filter || undefined, limit: PAGE, offset: nextOffset })
      .then((rows) => {
        setEntries((prev) => (reset ? rows : [...prev, ...rows]));
        setHasMore(rows.length === PAGE);
        setOffset(nextOffset + rows.length);
      })
      .catch((err) => {
        // 403: el rol no puede ver el registro (MEMBER/ANALYST).
        if (err instanceof SentraApiError && err.status === 403) setRestricted(true);
      })
      .finally(() => setLoading(false));
  }

  // Recarga desde cero cada vez que cambia el filtro.
  useEffect(() => {
    if (!allowed) {
      setRestricted(true);
      setLoading(false);
      return;
    }
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function describe(e: SentraAuditEntry): string {
    const t = e.target_label ?? '';
    const meta = e.meta ?? {};
    const from = String(meta.from ?? '');
    const to = String(meta.to ?? '');
    const role = String(meta.role ?? '');
    switch (e.action) {
      case 'member.invited': return dict.actions.memberInvited.replace('{target}', t).replace('{role}', role);
      case 'member.removed': return dict.actions.memberRemoved.replace('{target}', t);
      case 'member.role_changed': return dict.actions.memberRoleChanged.replace('{target}', t).replace('{from}', from).replace('{to}', to);
      case 'target.created': return dict.actions.targetCreated.replace('{target}', t);
      case 'target.deleted': return dict.actions.targetDeleted.replace('{target}', t);
      case 'apikey.created': return dict.actions.apikeyCreated.replace('{target}', t);
      case 'apikey.revoked': return dict.actions.apikeyRevoked.replace('{target}', t);
      case 'webhook.created': return dict.actions.webhookCreated.replace('{target}', t);
      case 'webhook.deleted': return dict.actions.webhookDeleted.replace('{target}', t);
      case 'password.changed': return dict.actions.passwordChanged;
      default: return dict.actions.unknown.replace('{action}', e.action);
    }
  }

  if (restricted) {
    return (
      <div>
        <SectionHeader icon={<ScrollText className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3">
          {dict.restricted}
        </p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader icon={<ScrollText className="w-5 h-5" />} title={dict.title} subtitle={dict.subtitle} />
      <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-5 max-w-2xl">{dict.intro}</p>

      <div className="mb-5">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
        >
          <option value="">{dict.filterAll}</option>
          {FILTERABLE.map((code) => (
            <option key={code} value={code}>{describeCode(code, dict)}</option>
          ))}
        </select>
      </div>

      {loading && entries.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-4">…</p>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{dict.empty}</p>
        </div>
      ) : (
        <>
          <ul className="rounded-2xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
            {entries.map((e) => {
              const v = actionVisual(e.action);
              return (
                <li key={e.id} className="flex items-start gap-3.5 px-5 py-3.5">
                  <span className={`mt-0.5 shrink-0 ${v.color}`}>{v.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-zinc-800 dark:text-zinc-200 leading-snug">
                      <span className="font-bold text-zinc-900 dark:text-white">{e.actor_email}</span>{' '}
                      {describe(e)}
                    </p>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="text-center mt-4">
              <button
                onClick={() => load(false)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
              >
                {loading ? '…' : dict.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Etiqueta corta del filtro: reusa la plantilla de la acción quitando los
// placeholders, para no mantener un segundo diccionario de nombres.
function describeCode(code: string, dict: AuditDict): string {
  const map: Record<string, string> = {
    'member.invited': dict.actions.memberInvited,
    'member.removed': dict.actions.memberRemoved,
    'member.role_changed': dict.actions.memberRoleChanged,
    'target.created': dict.actions.targetCreated,
    'target.deleted': dict.actions.targetDeleted,
    'apikey.created': dict.actions.apikeyCreated,
    'apikey.revoked': dict.actions.apikeyRevoked,
    'webhook.created': dict.actions.webhookCreated,
    'webhook.deleted': dict.actions.webhookDeleted,
    'password.changed': dict.actions.passwordChanged,
  };
  // Quita placeholders "{...}" y espacios sobrantes para el nombre del filtro.
  return (map[code] ?? code).replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
}
