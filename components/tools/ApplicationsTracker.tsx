'use client';

import { useEffect, useState } from 'react';
import { Briefcase, Plus, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import {
  sentraListApplications,
  sentraCreateApplication,
  sentraUpdateApplication,
  sentraDeleteApplication,
  type SentraApplication,
  type SentraAppStatus,
} from '@/lib/sentra/api';

const STATUSES: SentraAppStatus[] = ['saved', 'applied', 'interview', 'offer', 'rejected'];

const STATUS_STYLE: Record<SentraAppStatus, string> = {
  saved: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  applied: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25',
  interview: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  offer: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/25',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25',
};

const T = {
  es: {
    title: 'Mis postulaciones',
    subtitle: 'Sigue a qué empresas te postulaste, en qué estado va cada una y con qué CV.',
    company: 'Empresa',
    role: 'Puesto',
    url: 'Enlace de la oferta (opcional)',
    add: 'Agregar',
    adding: 'Agregando…',
    empty: 'Aún no tienes postulaciones. Agrega la primera arriba (o guárdala al generar un CV).',
    loading: 'Cargando…',
    delete: 'Eliminar',
    open: 'Abrir oferta',
    err: 'No se pudo guardar. Inténtalo de nuevo.',
    status: {
      saved: 'Guardado',
      applied: 'Postulado',
      interview: 'Entrevista',
      offer: 'Oferta',
      rejected: 'Rechazado',
    } as Record<SentraAppStatus, string>,
  },
  en: {
    title: 'My applications',
    subtitle: 'Track which companies you applied to, each one’s stage, and which CV you used.',
    company: 'Company',
    role: 'Role',
    url: 'Job posting link (optional)',
    add: 'Add',
    adding: 'Adding…',
    empty: 'No applications yet. Add your first one above (or save it when you generate a CV).',
    loading: 'Loading…',
    delete: 'Delete',
    open: 'Open posting',
    err: 'Could not save. Please try again.',
    status: {
      saved: 'Saved',
      applied: 'Applied',
      interview: 'Interview',
      offer: 'Offer',
      rejected: 'Rejected',
    } as Record<SentraAppStatus, string>,
  },
};

export default function ApplicationsTracker({ lang }: { lang: 'es' | 'en' }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const [apps, setApps] = useState<SentraApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    sentraListApplications()
      .then(setApps)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const created = await sentraCreateApplication({
        company: company.trim(),
        role: role.trim(),
        job_url: url.trim() || null,
      });
      setApps((prev) => [created, ...prev]);
      setCompany('');
      setRole('');
      setUrl('');
    } catch {
      setError(t.err);
    } finally {
      setAdding(false);
    }
  }

  async function changeStatus(id: string, status: SentraAppStatus) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a))); // optimista
    try {
      await sentraUpdateApplication(id, { status });
    } catch {
      // best-effort: si falla, recargamos para no dejar la UI mintiendo
      sentraListApplications().then(setApps).catch(() => {});
    }
  }

  async function remove(id: string) {
    setApps((prev) => prev.filter((a) => a.id !== id));
    try {
      await sentraDeleteApplication(id);
    } catch {
      sentraListApplications().then(setApps).catch(() => {});
    }
  }

  const counts = STATUSES.map((s) => ({ s, n: apps.filter((a) => a.status === s).length }));
  const inputCls =
    'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition';

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8">
      {/* Cabecera + resumen */}
      <div className="flex items-start gap-3 mb-1.5">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-green-500" />
        </span>
        <div>
          <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{t.title}</h2>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">{t.subtitle}</p>
        </div>
      </div>

      {apps.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 mb-5">
          {counts
            .filter((c) => c.n > 0)
            .map(({ s, n }) => (
              <span key={s} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLE[s]}`}>
                {t.status[s]} · {n}
              </span>
            ))}
        </div>
      )}

      {/* Alta rápida */}
      <form onSubmit={add} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mb-6">
        <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t.company} className={inputCls} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder={t.role} className={inputCls} />
        <button
          type="submit"
          disabled={adding || !company.trim() || !role.trim()}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-green-500 text-black text-sm font-bold hover:brightness-105 active:scale-[0.98] transition disabled:opacity-60"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {adding ? t.adding : t.add}
        </button>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.url}
          className={`${inputCls} sm:col-span-3`}
        />
      </form>

      {error && <p className="text-[13px] text-red-500 mb-4">{error}</p>}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-6 text-center">{t.loading}</p>
      ) : apps.length === 0 ? (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 py-6 text-center">{t.empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {apps.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{a.company}</p>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 truncate">{a.role}</p>
              </div>

              {a.score != null && (
                <span
                  title="Application Score"
                  className={`shrink-0 text-[12px] font-black px-2 py-0.5 rounded-md ${
                    a.score >= 80
                      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                      : a.score >= 65
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-red-500/15 text-red-600 dark:text-red-400'
                  }`}
                >
                  {a.score}
                </span>
              )}

              {a.job_url && (
                <a
                  href={a.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t.open}
                  className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold text-green-600 dark:text-green-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              <select
                value={a.status}
                onChange={(e) => changeStatus(a.id, e.target.value as SentraAppStatus)}
                className={`shrink-0 text-[12px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${STATUS_STYLE[a.status]}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    {t.status[s]}
                  </option>
                ))}
              </select>

              <button
                onClick={() => remove(a.id)}
                title={t.delete}
                className="shrink-0 p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
