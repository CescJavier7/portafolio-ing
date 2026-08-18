'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem, Check, X, ArrowLeft, Loader2, Copy, Clock, ExternalLink, CreditCard } from 'lucide-react';
import {
  sentraManualConfig,
  sentraSubmitPayment,
  sentraPayphonePrepare,
  SentraApiError,
  type SentraManualConfig,
} from '@/lib/sentra/api';

export interface UpgradeDict {
  title: string;
  subtitle: string;
  outOfScans: string;
  benefits: string[];
  price: string;
  cta: string;
  upgrading: string;
  later: string;
  testModeNote: string;
}

// Textos del flujo de pago MANUAL (bilingüe inline: evita tocar todos los
// diccionarios para esta feature). lang lo pasa el llamador.
const T = {
  es: {
    payTitle: 'Completa tu pago',
    intro: 'Paga por el método que prefieras y pega la referencia de la transacción. Activamos tu plan al verificarla (normalmente en pocas horas).',
    method: 'Método de pago',
    ref: 'Referencia / nº de transacción',
    refPh: 'Ej. 0102938475',
    note: 'Nota (opcional)',
    notePh: 'Correo con el que pagaste, hora, etc.',
    submit: 'Enviar comprobante',
    submitting: 'Enviando…',
    needRef: 'Ingresa la referencia de tu pago.',
    doneTitle: '¡Recibido! En revisión',
    doneBody: 'Verificaremos tu pago y activaremos tu plan. Te avisaremos por correo.',
    contact: 'Dudas sobre el pago:',
    back: 'Volver',
    close: 'Entendido',
    noMethods: 'Los métodos de pago se están configurando. Escríbenos y coordinamos.',
    genericErr: 'No se pudo enviar. Inténtalo de nuevo.',
    copy: 'Copiar',
    copied: 'Copiado',
    scanQr: 'Escanea el QR con tu app bancaria y paga',
    payNow: 'Pagar con tarjeta',
    payCardNow: 'Pagar con tarjeta',
    payCardNote: 'Te llevamos al pago seguro de PayPhone. Al volver, tu plan Pro se activa solo.',
    redirecting: 'Abriendo pago seguro…',
  },
  en: {
    payTitle: 'Complete your payment',
    intro: 'Pay with your preferred method and paste the transaction reference. We activate your plan once verified (usually within a few hours).',
    method: 'Payment method',
    ref: 'Reference / transaction #',
    refPh: 'e.g. 0102938475',
    note: 'Note (optional)',
    notePh: 'Email you paid with, time, etc.',
    submit: 'Submit proof',
    submitting: 'Sending…',
    needRef: 'Enter your payment reference.',
    doneTitle: 'Received! Under review',
    doneBody: 'We will verify your payment and activate your plan. You will get an email.',
    contact: 'Payment questions:',
    back: 'Back',
    close: 'Got it',
    noMethods: 'Payment methods are being set up. Write to us to coordinate.',
    genericErr: 'Could not submit. Please try again.',
    copy: 'Copy',
    copied: 'Copied',
    scanQr: 'Scan the QR with your banking app and pay',
    payNow: 'Pay by card',
    payCardNow: 'Pay by card',
    payCardNote: "We'll take you to PayPhone's secure checkout. When you return, your Pro plan activates automatically.",
    redirecting: 'Opening secure checkout…',
  },
};

type Step = 'sell' | 'pay' | 'done';

// Modal de upgrade con COBRO MANUAL (MVP Ecuador). Vende Pro y, en el segundo
// paso, muestra los métodos de pago y recoge la referencia de la transacción.
export default function UpgradeModal({
  open,
  onClose,
  dict,
  reason,
  lang = 'es',
}: {
  open: boolean;
  onClose: () => void;
  dict: UpgradeDict;
  reason?: string;
  lang?: 'es' | 'en';
}) {
  const t = T[lang === 'en' ? 'en' : 'es'];
  const [step, setStep] = useState<Step>('sell');
  const [config, setConfig] = useState<SentraManualConfig | null>(null);
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [ppBusy, setPpBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Cobro con tarjeta AUTOMÁTICO (PayPhone): preparamos el pago y redirigimos
  // al checkout hosteado. Al volver, /pago/confirmar activa el plan solo.
  async function startPayphone() {
    setPpBusy(true);
    setError(null);
    try {
      const { pay_url } = await sentraPayphonePrepare();
      window.location.href = pay_url; // navegamos (no popup: los bloqueadores matan la venta)
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : t.genericErr);
      setPpBusy(false);
    }
  }

  async function goPay() {
    setStep('pay');
    setError(null);
    if (!config) {
      try {
        const c = await sentraManualConfig();
        setConfig(c);
        if (c.methods[0]) setMethod(c.methods[0].key);
      } catch {
        /* se muestra el aviso de "sin métodos" */
      }
    }
  }

  async function submit() {
    if (!method || reference.trim().length < 2) {
      setError(t.needRef);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sentraSubmitPayment({ plan: 'PRO', method, reference: reference.trim(), note: note.trim() });
      setStep('done');
    } catch (err) {
      setError(err instanceof SentraApiError ? err.detail : t.genericErr);
    } finally {
      setBusy(false);
    }
  }

  const activeMethod = config?.methods.find((m) => m.key === method) ?? null;
  const isPayphoneAuto = activeMethod?.key === 'payphone' && !!config?.payphone_auto;
  const price = config?.price_pro ?? dict.price;

  // ── Tema CyberPunk Elegante: panel siempre oscuro (overlay), neón cian +
  // magenta, borde con glow, cuadrícula sutil y etiquetas monoespaciadas. ──
  const gridBg: React.CSSProperties = {
    backgroundImage:
      'linear-gradient(rgba(34,211,238,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.06) 1px, transparent 1px)',
    backgroundSize: '22px 22px',
  };
  const neonBtn =
    'w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black text-sm font-bold tracking-wide hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_0_28px_-8px_rgba(217,70,239,0.85)] disabled:opacity-60';
  const inputCls =
    'w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/40 transition';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300/70 mb-1.5 font-mono';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md sm:max-w-lg md:max-w-2xl rounded-3xl p-px bg-gradient-to-br from-cyan-500/60 via-fuchsia-500/40 to-cyan-500/5 shadow-[0_0_70px_-15px_rgba(217,70,239,0.55)]"
          >
            <div className="relative rounded-[23px] bg-[#0a0a12] overflow-hidden max-h-[92vh] flex flex-col">
              {/* Cuadrícula neón de fondo */}
              <div aria-hidden className="pointer-events-none absolute inset-0" style={gridBg} />

              {/* ── Cabecera ── */}
              <div className="relative px-7 md:px-9 pt-7 md:pt-8 pb-6 bg-gradient-to-br from-cyan-500/12 via-fuchsia-500/8 to-transparent shrink-0 border-b border-white/5">
                <button onClick={onClose} className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-cyan-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <p className="font-mono text-[10px] tracking-[0.3em] text-cyan-300/80 mb-3">SENTRA {'//'} PRO</p>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-600 flex items-center justify-center mb-4 shadow-[0_0_25px_-4px_rgba(34,211,238,0.7)]">
                  {step === 'done' ? <Check className="w-6 h-6 text-black" /> : <Gem className="w-6 h-6 text-black" />}
                </div>
                <h3 className="text-xl font-black tracking-tight text-white [text-shadow:0_0_18px_rgba(34,211,238,0.35)]">
                  {step === 'pay' ? t.payTitle : step === 'done' ? t.doneTitle : dict.title}
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {step === 'pay' ? t.intro : step === 'done' ? t.doneBody : dict.subtitle}
                </p>
              </div>

              <div className="relative px-7 md:px-9 pb-7 md:pb-8 pt-6 overflow-y-auto">
                {/* ── Paso 1: venta ── */}
                {step === 'sell' && (
                  <>
                    {reason && (
                      <p className="text-sm text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/25 rounded-xl px-4 py-3 mb-5">
                        {reason}
                      </p>
                    )}
                    <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-2.5 mb-6">
                      {dict.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                          <span className="shrink-0 w-5 h-5 mt-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center">
                            <Check className="w-3 h-3 text-cyan-300" />
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                    <div className="md:max-w-md md:mx-auto">
                      <button onClick={goPay} className={neonBtn}>
                        {dict.cta} — {dict.price}
                      </button>
                      <button onClick={onClose} className="w-full mt-2 py-2.5 text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition-colors">
                        {dict.later}
                      </button>
                    </div>
                  </>
                )}

                {/* ── Paso 2: pago ── */}
                {step === 'pay' && (
                  <div className="space-y-4">
                    {!config || config.methods.length === 0 ? (
                      <p className="text-sm text-zinc-300">
                        {t.noMethods} {config?.contact && <span className="font-semibold text-cyan-300">{config.contact}</span>}
                      </p>
                    ) : (
                      <>
                        <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/30 px-4 py-2.5 text-sm font-bold text-cyan-300 font-mono">
                          {price}
                        </div>
                        <div>
                          <label className={labelCls}>{t.method}</label>
                          <div className="flex flex-wrap gap-2">
                            {config.methods.map((m) => (
                              <button
                                key={m.key}
                                onClick={() => setMethod(m.key)}
                                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                                  method === m.key
                                    ? 'bg-cyan-400 text-black border-cyan-400 shadow-[0_0_18px_-3px_rgba(34,211,238,0.8)]'
                                    : 'border-white/15 text-zinc-300 hover:border-cyan-400/60 hover:text-cyan-200'
                                }`}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {isPayphoneAuto ? (
                          <div className="space-y-4 md:max-w-sm md:mx-auto">
                            <button onClick={startPayphone} disabled={ppBusy} className={neonBtn}>
                              {ppBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                              {ppBusy ? t.redirecting : t.payCardNow}
                            </button>
                            <p className="text-[12px] text-zinc-500 text-center">{t.payCardNote}</p>
                            {error && (
                              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5">{error}</p>
                            )}
                          </div>
                        ) : (
                          // Desktop: 2 columnas (izq. cómo pagar · der. comprobante).
                          // Móvil: se apilan. Da aire al modal en pantallas grandes.
                          <div className="md:grid md:grid-cols-2 md:gap-6 md:items-start">
                            {/* Columna izquierda: cómo pagar */}
                            <div className="space-y-4">
                              {activeMethod?.image && (
                                <div className="flex flex-col items-center gap-2 rounded-2xl bg-white border border-cyan-400/40 p-4 shadow-[0_0_25px_-8px_rgba(34,211,238,0.6)]">
                                  {/* QR de De Una: escanear y pagar sin copiar nada */}
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={activeMethod.image}
                                    alt="QR De Una — Banco Pichincha"
                                    className="w-44 h-44 object-contain"
                                    loading="lazy"
                                  />
                                  <p className="text-[11px] font-semibold text-zinc-500 text-center">{t.scanQr}</p>
                                </div>
                              )}

                              {/* Dato ESENCIAL a copiar (nº de cuenta): destacado, con
                                  su propio botón que copia SOLO el valor. */}
                              {activeMethod?.copy_value && (
                                <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/30 px-4 py-3">
                                  {activeMethod.copy_label && (
                                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300/70 mb-1">
                                      {activeMethod.copy_label}
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-lg font-mono font-bold text-cyan-200 tracking-wide break-all">
                                      {activeMethod.copy_value}
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(activeMethod.copy_value!);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 1500);
                                      }}
                                      className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-white transition-colors"
                                    >
                                      {copied ? <Check className="w-3.5 h-3.5 text-cyan-300" /> : <Copy className="w-3.5 h-3.5" />}
                                      {copied ? t.copied : t.copy}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Descripción de apoyo: texto plano legible (no textarea). */}
                              {activeMethod?.instructions && (
                                <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
                                  {activeMethod.instructions}
                                </p>
                              )}

                              {activeMethod?.url && (
                                <a
                                  href={activeMethod.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border border-cyan-400/40 text-cyan-200 text-sm font-bold hover:bg-cyan-400/10 active:scale-[0.98] transition"
                                >
                                  <ExternalLink className="w-4 h-4" /> {t.payNow}
                                </a>
                              )}
                            </div>

                            {/* Columna derecha: comprobante */}
                            <div className="space-y-4 mt-4 md:mt-0">
                              <div>
                                <label className={labelCls}>{t.ref}</label>
                                <input
                                  value={reference}
                                  onChange={(e) => setReference(e.target.value.replace(/\D/g, ''))}
                                  placeholder={t.refPh}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  className={`${inputCls} font-mono`}
                                />
                              </div>
                              <div>
                                <label className={labelCls}>{t.note}</label>
                                <input
                                  value={note}
                                  onChange={(e) => setNote(e.target.value)}
                                  placeholder={t.notePh}
                                  className={inputCls}
                                />
                              </div>

                              {error && (
                                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-2.5">{error}</p>
                              )}

                              <button onClick={submit} disabled={busy} className={neonBtn}>
                                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                                {busy ? t.submitting : t.submit}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <button onClick={() => setStep('sell')} className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-zinc-500 hover:text-cyan-300 transition-colors">
                      <ArrowLeft className="w-4 h-4" /> {t.back}
                    </button>
                  </div>
                )}

                {/* ── Paso 3: recibido ── */}
                {step === 'done' && (
                  <div className="text-center py-2 max-w-sm mx-auto">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center mb-4 shadow-[0_0_25px_-6px_rgba(34,211,238,0.7)]">
                      <Clock className="w-7 h-7 text-cyan-300" />
                    </div>
                    <p className="text-sm text-zinc-300 mb-6">{t.doneBody}</p>
                    {config?.contact && (
                      <p className="text-[12px] text-zinc-500 mb-4">{t.contact} <span className="font-semibold text-cyan-300">{config.contact}</span></p>
                    )}
                    <button onClick={onClose} className={neonBtn}>
                      {t.close}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
