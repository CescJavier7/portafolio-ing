'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, KeyRound, Gem, Check, LayoutDashboard, Radar, FileText, UserCog, BellRing, Route, Share2, Code2, Users, ScrollText } from 'lucide-react';
import {
  sentraChangePassword,
  sentraGetSubscription,
  sentraCancelSubscription,
  sentraHasToken,
  sentraLogout,
  sentraMe,
  sentraRefresh,
  SentraApiError,
  type SentraUser,
} from '@/lib/sentra/api';
import TargetsCard, { type TargetsDict } from '@/components/sentra/TargetsCard';
import UpgradeModal, { type UpgradeDict } from '@/components/sentra/UpgradeModal';
import FounderPayments from '@/components/sentra/FounderPayments';
import ProAvatar from '@/components/sentra/ProAvatar';
import OverviewSection, { type OverviewDict } from '@/components/sentra/panel/OverviewSection';
import ReportsSection, { type ReportsDict } from '@/components/sentra/panel/ReportsSection';
import AccountSection, { type AccountDict } from '@/components/sentra/panel/AccountSection';
import MonitorSection, { type MonitorDict } from '@/components/sentra/panel/MonitorSection';
import SurfaceSection, { type SurfaceDict } from '@/components/sentra/panel/SurfaceSection';
import ExposureSection, { type ExposureDict } from '@/components/sentra/panel/ExposureSection';
import ApiKeysSection, { type ApiKeysDict } from '@/components/sentra/panel/ApiKeysSection';
import TeamSection, { type TeamDict } from '@/components/sentra/panel/TeamSection';
import AuditSection, { type AuditDict } from '@/components/sentra/panel/AuditSection';
import { canManageTargets } from '@/lib/sentra/permissions';

interface DashboardDict {
  nav: {
    overview: string; tool: string; reports: string; account: string; soon: string;
    dns: string; traffic: string; graph: string; apiKeys: string; team: string; audit: string;
  };
  overview: OverviewDict;
  reports: ReportsDict;
  account: AccountDict;
  monitor: MonitorDict;
  surface: SurfaceDict;
  exposure: ExposureDict;
  apiKeys: ApiKeysDict;
  team: TeamDict;
  audit: AuditDict;
  soonTitle: string;
  soonBody: string;
}

interface Dict {
  title: string;
  wip: string;
  sessionAs: string;
  logout: string;
  loading: string;
  securityTitle: string;
  securityDesc: string;
  currentPassword: string;
  newPassword: string;
  newPasswordHint: string;
  changeSubmit: string;
  changing: string;
  changed: string;
  planTitle: string;
  planFree: string;
  planDesc: string;
  planProDesc: string;
  upgrade: string;
  upgrading: string;
  upgradeError: string;
  testModeNote: string;
  manageBtn: string;
  managing: string;
  manageError: string;
  targets: TargetsDict;
  upgrade_modal: UpgradeDict;
  dashboard: DashboardDict;
}

type SectionId = 'overview' | 'tool' | 'reports' | 'account' | 'dns' | 'traffic' | 'graph' | 'apiKeys' | 'team' | 'audit';

const inputClass =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition';

const CANCEL_T = {
  es: {
    active: 'Plan Pro activo',
    cancel: 'Cancelar suscripción',
    title: '¿Cancelar tu plan Pro?',
    body: 'Bajarás al plan Gratis de inmediato y perderás el acceso Pro. No hay reembolsos por el período en curso.',
    yes: 'Sí, cancelar',
    no: 'Mantener Pro',
    cancelling: 'Cancelando…',
    err: 'No se pudo cancelar. Inténtalo de nuevo.',
  },
  en: {
    active: 'Pro plan active',
    cancel: 'Cancel subscription',
    title: 'Cancel your Pro plan?',
    body: 'You will drop to the Free plan immediately and lose Pro access. There are no refunds for the current period.',
    yes: 'Yes, cancel',
    no: 'Keep Pro',
    cancelling: 'Cancelling…',
    err: 'Could not cancel. Please try again.',
  },
};

function PlanCard({ dict, lang, onUpgrade }: { dict: Dict; lang: string; onUpgrade: () => void }) {
  const [plan, setPlan] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const ct = CANCEL_T[lang === 'en' ? 'en' : 'es'];

  useEffect(() => {
    sentraGetSubscription()
      .then((sub) => setPlan(sub.plan))
      .catch(() => setPlan('FREE')); // sin drama: el plan por defecto es FREE
  }, []);

  const isPro = plan === 'PRO';

  async function handleCancel() {
    setCancelBusy(true);
    setCancelError(null);
    try {
      await sentraCancelSubscription();
      setPlan('FREE');
      setCancelOpen(false);
    } catch (err) {
      setCancelError(err instanceof SentraApiError ? err.detail : ct.err);
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 mt-6">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Gem className="w-5 h-5 text-green-500" />
          </div>
          <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
            {dict.planTitle}
          </h2>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest border ${
            isPro
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          {plan === null ? '…' : isPro ? 'Pro' : dict.planFree}
        </span>
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        {isPro ? dict.planProDesc : dict.planDesc}
      </p>

      {!isPro && (
        <>
          {/* Abre el flujo de pago MANUAL (transferencia / De Una / PayPhone /
              PayPal). Ya no vamos a Lemon Squeezy. */}
          <button
            onClick={onUpgrade}
            disabled={plan === null}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
          >
            <Gem className="w-4 h-4" /> {dict.upgrade}
          </button>
          <p className="mt-4 text-[11px] text-zinc-400 dark:text-zinc-500">{dict.testModeNote}</p>
        </>
      )}

      {isPro && (
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/20 px-4 py-2 text-sm font-semibold text-green-600 dark:text-green-400">
            <Check className="w-4 h-4" /> {ct.active}
          </div>

          {!cancelOpen ? (
            <button
              onClick={() => setCancelOpen(true)}
              className="block text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              {ct.cancel}
            </button>
          ) : (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 max-w-sm">
              <p className="text-sm font-bold text-zinc-900 dark:text-white mb-1">{ct.title}</p>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">{ct.body}</p>
              {cancelError && <p className="text-[13px] text-red-500 mb-2">{cancelError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  disabled={cancelBusy}
                  className="px-4 py-2 rounded-full bg-red-500 text-white text-[13px] font-bold hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {cancelBusy ? ct.cancelling : ct.yes}
                </button>
                <button
                  onClick={() => setCancelOpen(false)}
                  disabled={cancelBusy}
                  className="px-4 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-[13px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
                >
                  {ct.no}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChangePasswordCard({ dict }: { dict: Dict }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(false);
    try {
      await sentraChangePassword({ current_password: current, new_password: next });
      setOk(true);
      setCurrent('');
      setNext('');
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : 'Error de conexión.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-8 mt-6">
      <div className="flex items-center gap-3 mb-1.5">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-green-500" />
        </div>
        <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">
          {dict.securityTitle}
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{dict.securityDesc}</p>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            {dict.currentPassword}
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
            {dict.newPassword}
          </label>
          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">{dict.newPasswordHint}</p>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}
        {ok && (
          <p className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            {dict.changed}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 disabled:hover:scale-100"
        >
          {busy ? dict.changing : dict.changeSubmit}
        </button>
      </form>
    </div>
  );
}

export default function SentraPanel({ lang, dict }: { lang: string; dict: Dict }) {
  const router = useRouter();
  const [user, setUser] = useState<SentraUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState<SectionId>('overview');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Sin token en sessionStorage (pestaña nueva, o expiró): intentamos
      // renovar con la cookie httpOnly de refresh antes de rendirnos.
      if (!sentraHasToken()) {
        const alive = await sentraRefresh();
        if (!alive) {
          router.replace(`/${lang}/sentinel/login`);
          return;
        }
      }
      try {
        const me = await sentraMe();
        if (!cancelled) {
          setUser(me);
          setChecking(false);
        }
      } catch {
        // Token presente pero rechazado (expiró hace rato): un último
        // intento de refresh y si no, al login.
        const alive = await sentraRefresh();
        if (!alive) {
          router.replace(`/${lang}/sentinel/login`);
          return;
        }
        const me = await sentraMe();
        if (!cancelled) {
          setUser(me);
          setChecking(false);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [lang, router]);

  async function handleLogout() {
    await sentraLogout();
    router.replace(`/${lang}/sentinel/login`);
  }

  if (checking || !user) {
    return (
      <section className="min-h-screen pt-32 pb-24 bg-zinc-50 dark:bg-[#020617] flex items-start justify-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400 animate-pulse mt-20">{dict.loading}</p>
      </section>
    );
  }

  const nav = dict.dashboard.nav;
  // El registro de auditoría es solo para OWNER/ADMIN (igual que el backend):
  // no le mostramos el ítem de nav a un Analista/Miembro, que igual recibiría
  // 403 al abrirlo.
  const canSeeAudit = canManageTargets(user.role);
  const mainItems: { id: SectionId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: nav.overview, icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'tool', label: nav.tool, icon: <Radar className="w-4 h-4" /> },
    { id: 'reports', label: nav.reports, icon: <FileText className="w-4 h-4" /> },
    { id: 'dns', label: nav.dns, icon: <BellRing className="w-4 h-4" /> },
    { id: 'graph', label: nav.graph, icon: <Share2 className="w-4 h-4" /> },
    { id: 'traffic', label: nav.traffic, icon: <Route className="w-4 h-4" /> },
    { id: 'apiKeys', label: nav.apiKeys, icon: <Code2 className="w-4 h-4" /> },
    { id: 'team', label: nav.team, icon: <Users className="w-4 h-4" /> },
    ...(canSeeAudit ? [{ id: 'audit' as SectionId, label: nav.audit, icon: <ScrollText className="w-4 h-4" /> }] : []),
    { id: 'account', label: nav.account, icon: <UserCog className="w-4 h-4" /> },
  ];
  const soonItems: { id: SectionId; label: string; icon: React.ReactNode }[] = [];

  return (
    <section className="min-h-screen pt-14 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* ===== SIDEBAR (desktop/tablet landscape) ===== */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] border-r border-zinc-200 dark:border-zinc-800 px-4 py-6">
          <div className="flex items-center gap-3 px-2 mb-6">
            <ProAvatar email={user.email} plan={user.plan} size={40} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{user.name || user.email}</p>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-green-600 dark:text-green-400">{user.plan}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {mainItems.map((it) => (
              <NavButton key={it.id} item={it} active={active === it.id} onClick={() => setActive(it.id)} />
            ))}
          </nav>

          {soonItems.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 px-3 mt-6 mb-2">
                {nav.soon}
              </p>
              <nav className="flex flex-col gap-1">
                {soonItems.map((it) => (
                  <NavButton key={it.id} item={it} active={active === it.id} onClick={() => setActive(it.id)} soon />
                ))}
              </nav>
            </>
          )}

          <button
            onClick={handleLogout}
            className="mt-auto inline-flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" /> {dict.logout}
          </button>
        </aside>

        {/* ===== CONTENIDO ===== */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 py-6 pb-24">
          {/* Nav horizontal (móvil / tablet portrait) */}
          <div className="lg:hidden -mx-4 px-4 mb-6 overflow-x-auto">
            <div className="flex gap-2 w-max">
              {[...mainItems, ...soonItems].map((it) => {
                const isSoon = soonItems.some((s) => s.id === it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => setActive(it.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active === it.id
                        ? 'bg-green-500 text-black'
                        : 'bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {it.icon}
                    {it.label}
                    {isSoon && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl"
            >
              {active === 'overview' && (
                <div className="space-y-6">
                  {/* Solo visible para el fundador (se auto-oculta si /pending da 403) */}
                  <FounderPayments />
                  <OverviewSection dict={dict.dashboard.overview} />
                </div>
              )}
              {active === 'tool' && <TargetsCard dict={dict.targets} upgradeDict={dict.upgrade_modal} lang={lang} role={user.role} />}
              {active === 'reports' && (
                <ReportsSection
                  dict={dict.dashboard.reports}
                  pdfLabels={dict.targets.scanUI.pdf}
                  lang={lang}
                  onUpgrade={() => setUpgradeOpen(true)}
                />
              )}
              {active === 'account' && (
                <AccountSection dict={dict.dashboard.account} user={user} onUpdated={setUser}>
                  <PlanCard dict={dict} lang={lang} onUpgrade={() => setUpgradeOpen(true)} />
                  <ChangePasswordCard dict={dict} />
                </AccountSection>
              )}
              {active === 'dns' && <MonitorSection dict={dict.dashboard.monitor} role={user.role} />}
              {active === 'traffic' && <ExposureSection dict={dict.dashboard.exposure} role={user.role} onUpgrade={() => setUpgradeOpen(true)} />}
              {active === 'graph' && <SurfaceSection dict={dict.dashboard.surface} role={user.role} onUpgrade={() => setUpgradeOpen(true)} />}
              {active === 'apiKeys' && <ApiKeysSection dict={dict.dashboard.apiKeys} user={user} onUpgrade={() => setUpgradeOpen(true)} />}
              {active === 'team' && <TeamSection dict={dict.dashboard.team} user={user} onUpgrade={() => setUpgradeOpen(true)} />}
              {active === 'audit' && <AuditSection dict={dict.dashboard.audit} user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} dict={dict.upgrade_modal} lang={lang as 'es' | 'en'} />
    </section>
  );
}

function NavButton({
  item,
  active,
  onClick,
  soon,
}: {
  item: { label: string; icon: React.ReactNode };
  active: boolean;
  onClick: () => void;
  soon?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
        active
          ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent'
      }`}
    >
      <span className={active ? 'text-green-500' : 'text-zinc-400 dark:text-zinc-500'}>{item.icon}</span>
      <span className="flex-1 text-left">{item.label}</span>
      {soon && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
    </button>
  );
}
