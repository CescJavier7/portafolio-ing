'use client';

import { useEffect, useState } from 'react';
import { Target, Loader2, Check, X, Sparkles, ThumbsUp, ThumbsDown, ShieldCheck, ShieldAlert, AlertTriangle, CopyCheck } from 'lucide-react';
import {
  sentraGetSearchProfile,
  sentraSaveSearchProfile,
  sentraEvaluateOffer,
  SentraApiError,
  type SentraSearchProfileInput,
  type SentraEvaluation,
  type SentraVerdict,
} from '@/lib/sentra/api';

const EMPTY: SentraSearchProfileInput = {
  target_role: '', seniority: '', user_years_experience: 0, min_salary: null, salary_currency: 'USD',
  max_required_experience: null, open_to_relocate: false, visa_needed: false,
  locations: [], modalities: [], technologies: [], industries: [],
  desired_companies: [], blocked_companies: [], languages: [], deal_breakers: [],
};

const MODALITIES = ['remoto', 'hibrido', 'presencial'] as const;

const T = {
  es: {
    title: 'Tu objetivo laboral',
    subtitle: 'Dile a Sentra qué trabajo quieres — y qué NO — para que decida a qué ofertas vale la pena aplicar.',
    role: 'Cargo objetivo', rolePh: 'Ej. Analista de Ciberseguridad',
    seniority: 'Seniority', years: 'Tus años de experiencia',
    minSalary: 'Salario mínimo', maxExp: 'No aplicar si piden más de (años)', maxExpHint: 'Deja vacío para no filtrar por experiencia.',
    modalities: 'Modalidad que aceptas', relocate: 'Dispuesto a reubicarme', visa: 'Necesito patrocinio de visa',
    tech: 'Tecnologías / skills', techPh: 'Python, React, SQL…',
    locations: 'Ubicaciones', locationsPh: 'Ecuador, Quito, Remoto LATAM…',
    languages: 'Idiomas', languagesPh: 'es, en…',
    dealBreakers: 'Lo que NO quieres (deal-breakers)', dealBreakersPh: 'ventas, soporte, call center…',
    blocked: 'Empresas que NO', blockedPh: 'Nombre de empresa…',
    save: 'Guardar objetivo', saving: 'Guardando…', saved: 'Guardado',
    seniorityOpts: { '': 'Cualquiera', junior: 'Junior', mid: 'Mid', senior: 'Senior' } as Record<string, string>,
    // Evaluador
    evalTitle: '¿Debería aplicar a esta oferta?',
    evalSub: 'Pega una oferta y Sentra la puntúa contra tu objetivo — antes de que gastes tu tiempo.',
    offerPh: 'Pega aquí la descripción de la vacante…',
    evaluate: 'Evaluar oferta', evaluating: 'Analizando…',
    needProfile: 'Completa al menos tus tecnologías arriba para una evaluación útil.',
    evErr: 'No se pudo evaluar. Inténtalo de nuevo.',
    whyApply: 'Lo que cumples', whyAvoid: '¿Por qué NO deberías aplicar?',
    breakdownTitle: 'Desglose',
    verdict: { apply: 'Aplicar', maybe: 'Aplicar solo si…', avoid: 'No aplicar' } as Record<SentraVerdict, string>,
    labels: {
      requisitos_obligatorios: 'Requisitos', requisitos_deseables: 'Deseables',
      ubicacion_modalidad: 'Ubicación/modalidad', seniority: 'Seniority', idioma: 'Idioma', keywords_ats: 'Keywords ATS',
    } as Record<string, string>,
    add: 'Añadir (Enter)',
    // Application Firewall
    fwDanger: 'Alto riesgo de estafa',
    fwCaution: 'Señales sospechosas',
    fwDangerSub: 'Esta oferta tiene marcas típicas de fraude laboral. No envíes dinero ni datos personales.',
    fwCautionSub: 'Revisa estas señales antes de continuar.',
    fwFlags: {
      advance_fee: 'Te piden pagar por adelantado (inscripción, kit, material). Un empleo legítimo NUNCA cobra por contratarte.',
      crypto_payment: 'Mencionan pagos o inversiones en cripto. Señal habitual de fraude.',
      sensitive_data: 'Piden datos sensibles (tarjeta, contraseñas, cédula) antes de contratarte.',
      unreal_salary: 'Sueldo desproporcionado para el trabajo ofrecido. Si es demasiado bueno para ser verdad…',
      instant_hire: 'Contratación inmediata, sin entrevista ni requisitos. Táctica para no darte tiempo a dudar.',
      messaging_only: 'El único contacto es WhatsApp/Telegram. Las empresas serias usan canales oficiales.',
      free_email_only: 'El contacto es un correo gratuito (Gmail/Hotmail), no un dominio corporativo.',
      url_shortener: 'Usan enlaces acortados que ocultan el destino real (posible phishing).',
      anonymous_company: 'No nombran a la empresa. Desconfía de una "importante empresa" sin identidad.',
    } as Record<string, string>,
    dupTitle: 'Ya te postulaste a algo casi idéntico',
    dupSub: 'similar a una postulación que ya tienes',
    dupStatus: { saved: 'Guardado', applied: 'Postulado', interview: 'Entrevista', offer: 'Oferta', rejected: 'Rechazado' } as Record<string, string>,
  },
  en: {
    title: 'Your job target',
    subtitle: 'Tell Sentra what job you want — and what you don’t — so it decides which offers are worth applying to.',
    role: 'Target role', rolePh: 'e.g. Cybersecurity Analyst',
    seniority: 'Seniority', years: 'Your years of experience',
    minSalary: 'Minimum salary', maxExp: 'Skip if they require more than (years)', maxExpHint: 'Leave empty to not filter by experience.',
    modalities: 'Modality you accept', relocate: 'Willing to relocate', visa: 'I need visa sponsorship',
    tech: 'Technologies / skills', techPh: 'Python, React, SQL…',
    locations: 'Locations', locationsPh: 'Ecuador, Quito, Remote LATAM…',
    languages: 'Languages', languagesPh: 'es, en…',
    dealBreakers: 'What you DON’T want (deal-breakers)', dealBreakersPh: 'sales, support, call center…',
    blocked: 'Blocked companies', blockedPh: 'Company name…',
    save: 'Save target', saving: 'Saving…', saved: 'Saved',
    seniorityOpts: { '': 'Any', junior: 'Junior', mid: 'Mid', senior: 'Senior' } as Record<string, string>,
    evalTitle: 'Should I apply to this job?',
    evalSub: 'Paste a job posting and Sentra scores it against your target — before you waste your time.',
    offerPh: 'Paste the job posting here…',
    evaluate: 'Evaluate job', evaluating: 'Analyzing…',
    needProfile: 'Add at least your technologies above for a useful evaluation.',
    evErr: 'Could not evaluate. Please try again.',
    whyApply: 'What you meet', whyAvoid: 'Why you should NOT apply',
    breakdownTitle: 'Breakdown',
    verdict: { apply: 'Apply', maybe: 'Apply only if…', avoid: 'Don’t apply' } as Record<SentraVerdict, string>,
    labels: {
      requisitos_obligatorios: 'Requirements', requisitos_deseables: 'Nice-to-have',
      ubicacion_modalidad: 'Location/modality', seniority: 'Seniority', idioma: 'Language', keywords_ats: 'ATS keywords',
    } as Record<string, string>,
    add: 'Add (Enter)',
    // Application Firewall
    fwDanger: 'High scam risk',
    fwCaution: 'Suspicious signals',
    fwDangerSub: 'This posting shows typical job-fraud markers. Never send money or personal data.',
    fwCautionSub: 'Review these signals before continuing.',
    fwFlags: {
      advance_fee: 'They ask you to pay upfront (registration, kit, materials). A real job NEVER charges to hire you.',
      crypto_payment: 'They mention crypto payments or investments. A common fraud signal.',
      sensitive_data: 'They request sensitive data (card, passwords, ID) before hiring you.',
      unreal_salary: 'Pay is disproportionate to the work offered. If it sounds too good to be true…',
      instant_hire: 'Instant hire, no interview or requirements. A tactic to rush your decision.',
      messaging_only: 'The only contact is WhatsApp/Telegram. Serious companies use official channels.',
      free_email_only: 'Contact is a free email (Gmail/Hotmail), not a corporate domain.',
      url_shortener: 'They use shortened links that hide the real destination (possible phishing).',
      anonymous_company: 'They don’t name the company. Beware of a "leading company" with no identity.',
    } as Record<string, string>,
    dupTitle: 'You already applied to something nearly identical',
    dupSub: 'similar to an application you already have',
    dupStatus: { saved: 'Saved', applied: 'Applied', interview: 'Interview', offer: 'Offer', rejected: 'Rejected' } as Record<string, string>,
  },
};

const MODALITY_LABEL: Record<string, { es: string; en: string }> = {
  remoto: { es: 'Remoto', en: 'Remote' },
  hibrido: { es: 'Híbrido', en: 'Hybrid' },
  presencial: { es: 'Presencial', en: 'On-site' },
};

const VERDICT_STYLE: Record<SentraVerdict, { badge: string; ring: string; icon: string }> = {
  apply: { badge: 'bg-green-500 text-black', ring: 'border-green-500/40 shadow-[0_0_40px_-12px_rgba(34,197,94,0.5)]', icon: 'text-green-500' },
  maybe: { badge: 'bg-amber-500 text-black', ring: 'border-amber-500/40 shadow-[0_0_40px_-12px_rgba(245,158,11,0.5)]', icon: 'text-amber-500' },
  avoid: { badge: 'bg-red-500 text-white', ring: 'border-red-500/40 shadow-[0_0_40px_-12px_rgba(239,68,68,0.5)]', icon: 'text-red-500' },
};

const inputCls =
  'w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500/40 transition';
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5';

function TagInput({ values, onChange, placeholder, danger }: { values: string[]; onChange: (v: string[]) => void; placeholder: string; danger?: boolean }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <div className={`rounded-xl bg-white dark:bg-zinc-900/60 border px-2.5 py-2 flex flex-wrap gap-1.5 focus-within:ring-2 focus-within:ring-green-500/40 ${danger ? 'border-red-300 dark:border-red-500/30' : 'border-zinc-300 dark:border-zinc-700'}`}>
      {values.map((v) => (
        <span key={v} className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full ${danger ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-green-500/10 text-green-700 dark:text-green-400'}`}>
          {v}
          <button onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-zinc-900 dark:hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          if (e.key === 'Backspace' && !draft && values.length) onChange(values.slice(0, -1));
        }}
        onBlur={add}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 px-1.5 py-0.5 focus:outline-none"
      />
    </div>
  );
}

export default function JobAgentTab({ lang }: { lang: 'es' | 'en' }) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const [p, setP] = useState<SentraSearchProfileInput>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [offer, setOffer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [ev, setEv] = useState<SentraEvaluation | null>(null);
  const [evErr, setEvErr] = useState<string | null>(null);

  useEffect(() => {
    sentraGetSearchProfile()
      .then((sp) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, created_at, updated_at, ...rest } = sp;
        setP(rest);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof SentraSearchProfileInput>(k: K, v: SentraSearchProfileInput[K]) =>
    setP((prev) => ({ ...prev, [k]: v }));

  const toggleModality = (m: string) =>
    set('modalities', p.modalities.includes(m) ? p.modalities.filter((x) => x !== m) : [...p.modalities, m]);

  async function save() {
    setSaving(true);
    try {
      await sentraSaveSearchProfile(p);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* silencioso */
    } finally {
      setSaving(false);
    }
  }

  async function evaluate() {
    if (offer.trim().length < 30) return;
    setEvaluating(true);
    setEvErr(null);
    setEv(null);
    try {
      setEv(await sentraEvaluateOffer(offer.trim()));
    } catch (e) {
      setEvErr(e instanceof SentraApiError ? e.detail : t.evErr);
    } finally {
      setEvaluating(false);
    }
  }

  if (loading) {
    return <p className="text-center text-sm text-zinc-400 dark:text-zinc-500 animate-pulse py-16">…</p>;
  }

  // Application Firewall: si es estafa clara (danger) el backend cortó en seco →
  // no hay desglose ni análisis real, mostramos SOLO el aviso de estafa.
  const fwLevel = ev?.firewall?.risk_level;
  const scam = fwLevel === 'danger';

  return (
    <div className="space-y-8">
      {/* ── Perfil de búsqueda ── */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8">
        <div className="flex items-start gap-3 mb-6">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-500" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{t.title}</h2>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">{t.subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label className={labelCls}>{t.role}</label>
            <input value={p.target_role} onChange={(e) => set('target_role', e.target.value)} placeholder={t.rolePh} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.seniority}</label>
              <select value={p.seniority} onChange={(e) => set('seniority', e.target.value)} className={inputCls}>
                {Object.entries(t.seniorityOpts).map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t.years}</label>
              <input type="number" min={0} value={p.user_years_experience} onChange={(e) => set('user_years_experience', Number(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>{t.minSalary}</label>
              <input type="number" min={0} value={p.min_salary ?? ''} onChange={(e) => set('min_salary', e.target.value ? Number(e.target.value) : null)} placeholder="—" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t.maxExp}</label>
              <input type="number" min={0} value={p.max_required_experience ?? ''} onChange={(e) => set('max_required_experience', e.target.value ? Number(e.target.value) : null)} placeholder="—" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>{t.modalities}</label>
            <div className="flex gap-2 pt-1">
              {MODALITIES.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleModality(m)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                    p.modalities.includes(m)
                      ? 'bg-green-500 text-black border-green-500'
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-green-400'
                  }`}
                >
                  {MODALITY_LABEL[m][lang === 'en' ? 'en' : 'es']}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={labelCls}>{t.tech}</label>
            <TagInput values={p.technologies} onChange={(v) => set('technologies', v)} placeholder={t.techPh} />
          </div>
          <div>
            <label className={labelCls}>{t.locations}</label>
            <TagInput values={p.locations} onChange={(v) => set('locations', v)} placeholder={t.locationsPh} />
          </div>
          <div>
            <label className={labelCls}>{t.languages}</label>
            <TagInput values={p.languages} onChange={(v) => set('languages', v)} placeholder={t.languagesPh} />
          </div>
          <div>
            <label className={labelCls}>⛔ {t.dealBreakers}</label>
            <TagInput values={p.deal_breakers} onChange={(v) => set('deal_breakers', v)} placeholder={t.dealBreakersPh} danger />
          </div>
          <div>
            <label className={labelCls}>⛔ {t.blocked}</label>
            <TagInput values={p.blocked_companies} onChange={(v) => set('blocked_companies', v)} placeholder={t.blockedPh} danger />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-5 pt-1">
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={p.open_to_relocate} onChange={(e) => set('open_to_relocate', e.target.checked)} className="accent-green-500 w-4 h-4" />
              {t.relocate}
            </label>
            <label className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={p.visa_needed} onChange={(e) => set('visa_needed', e.target.checked)} className="accent-green-500 w-4 h-4" />
              {t.visa}
            </label>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
            {saving ? t.saving : saved ? t.saved : t.save}
          </button>
        </div>
      </div>

      {/* ── Evaluador ── */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 md:p-8">
        <div className="flex items-start gap-3 mb-5">
          <span className="w-10 h-10 shrink-0 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-green-500" />
          </span>
          <div>
            <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white">{t.evalTitle}</h2>
            <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-snug">{t.evalSub}</p>
          </div>
        </div>

        <textarea value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={t.offerPh} rows={4} className={`${inputCls} resize-y`} />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={evaluate}
            disabled={evaluating || offer.trim().length < 30}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {evaluating ? t.evaluating : t.evaluate}
          </button>
          {p.technologies.length === 0 && <span className="text-[12px] text-amber-600 dark:text-amber-400">{t.needProfile}</span>}
        </div>
        {evErr && <p className="text-[13px] text-red-500 mt-3">{evErr}</p>}

        {/* Veredicto */}
        {ev && (
          <div className={`mt-6 rounded-2xl border p-5 md:p-6 bg-zinc-50 dark:bg-white/[0.03] ${scam ? 'border-red-500/50 shadow-[0_0_40px_-12px_rgba(239,68,68,0.6)]' : VERDICT_STYLE[ev.verdict].ring}`}>
            {/* ── Application Firewall: aviso de estafa (lo más prominente) ── */}
            {fwLevel && fwLevel !== 'safe' && (
              <div className={`rounded-xl border p-4 mb-4 ${scam ? 'border-red-500/40 bg-red-500/10' : 'border-amber-500/30 bg-amber-500/10'}`}>
                <p className={`text-[13px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ${scam ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {scam ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {scam ? t.fwDanger : t.fwCaution}
                </p>
                <p className="text-[12px] text-zinc-600 dark:text-zinc-300 mb-3">{scam ? t.fwDangerSub : t.fwCautionSub}</p>
                <ul className="space-y-1.5">
                  {ev.firewall.flags.map((f) => (
                    <li key={f.code} className="text-[13px] text-zinc-700 dark:text-zinc-200 flex items-start gap-2">
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          f.severity === 'high' ? 'bg-red-500' : f.severity === 'medium' ? 'bg-amber-500' : 'bg-zinc-400'
                        }`}
                      />
                      {t.fwFlags[f.code] ?? f.code}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Duplicate Killer: ya aplicaste a algo casi idéntico ── */}
            {ev.duplicate && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 mb-4">
                <p className="text-[13px] font-black uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1 flex items-center gap-1.5">
                  <CopyCheck className="w-4 h-4" /> {t.dupTitle}
                </p>
                <p className="text-[13px] text-zinc-700 dark:text-zinc-200">
                  {ev.duplicate.similarity}% {t.dupSub}:{' '}
                  <strong>{[ev.duplicate.role, ev.duplicate.company].filter(Boolean).join(' · ')}</strong>
                  {ev.duplicate.status && (
                    <span className="ml-1 text-zinc-500">({t.dupStatus[ev.duplicate.status] ?? ev.duplicate.status})</span>
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-black uppercase tracking-wide ${VERDICT_STYLE[ev.verdict].badge}`}>
                  {ev.verdict === 'avoid' ? <ThumbsDown className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4" />}
                  {t.verdict[ev.verdict]}
                </span>
                {(ev.company || ev.role) && (
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-2 truncate">
                    {[ev.role, ev.company].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={`text-4xl font-black tracking-tighter ${scam ? 'text-red-500' : VERDICT_STYLE[ev.verdict].icon}`}>{ev.score}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Application Score</div>
              </div>
            </div>

            {/* Con estafa clara el backend no analiza (score 0): ocultamos el
                desglose y las razones, que no aportan sobre una oferta fraudulenta. */}
            {!scam && (
            <>
            {/* Desglose */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
              {Object.entries(ev.breakdown).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 truncate">{t.labels[k] ?? k}</p>
                  <p className="text-sm font-black text-zinc-900 dark:text-white">{v}</p>
                </div>
              ))}
            </div>

            {/* ¿Por qué NO aplicar? — la estrella */}
            {ev.reasons_avoid.length > 0 && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4 mb-3">
                <p className="text-[12px] font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                  <ThumbsDown className="w-3.5 h-3.5" /> {t.whyAvoid}
                </p>
                <ul className="space-y-1">
                  {ev.reasons_avoid.map((r, i) => (
                    <li key={i} className="text-[13px] text-zinc-700 dark:text-zinc-200 flex items-start gap-2">
                      <X className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ev.reasons_apply.length > 0 && (
              <div className="rounded-xl border border-green-500/25 bg-green-500/5 p-4">
                <p className="text-[12px] font-black uppercase tracking-wider text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t.whyApply}
                </p>
                <ul className="space-y-1">
                  {ev.reasons_apply.map((r, i) => (
                    <li key={i} className="text-[13px] text-zinc-700 dark:text-zinc-200 flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
