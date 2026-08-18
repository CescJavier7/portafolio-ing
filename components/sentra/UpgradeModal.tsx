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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
          >
            <div className="relative px-7 pt-7 pb-6 bg-gradient-to-br from-amber-400/15 via-yellow-500/10 to-transparent shrink-0">
              <button onClick={onClose} className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                {step === 'done' ? <Check className="w-6 h-6 text-white" /> : <Gem className="w-6 h-6 text-white" />}
              </div>
              <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                {step === 'pay' ? t.payTitle : step === 'done' ? t.doneTitle : dict.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {step === 'pay' ? t.intro : step === 'done' ? t.doneBody : dict.subtitle}
              </p>
            </div>

            <div className="px-7 pb-7 overflow-y-auto">
              {/* ── Paso 1: venta ── */}
              {step === 'sell' && (
                <>
                  {reason && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-5">
                      {reason}
                    </p>
                  )}
                  <ul className="space-y-2.5 mb-6">
                    {dict.benefits.map((b, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
                        <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-green-500/15 flex items-center justify-center">
                          <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                        </span>
                        {b}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={goPay}
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-sm font-bold hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20"
                  >
                    {dict.cta} — {dict.price}
                  </button>
                  <button onClick={onClose} className="w-full mt-2 py-2.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    {dict.later}
                  </button>
                </>
              )}

              {/* ── Paso 2: pago ── */}
              {step === 'pay' && (
                <div className="space-y-4">
                  {!config || config.methods.length === 0 ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">
                      {t.noMethods} {config?.contact && <span className="font-semibold">{config.contact}</span>}
                    </p>
                  ) : (
                    <>
                      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-400">
                        {price}
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{t.method}</label>
                        <div className="flex flex-wrap gap-2">
                          {config.methods.map((m) => (
                            <button
                              key={m.key}
                              onClick={() => setMethod(m.key)}
                              className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                                method === m.key
                                  ? 'bg-green-500 text-black border-green-500'
                                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-green-400'
                              }`}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {isPayphoneAuto ? (
                        <>
                          <button
                            onClick={startPayphone}
                            disabled={ppBusy}
                            className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-green-500 text-black text-sm font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
                          >
                            {ppBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                            {ppBusy ? t.redirecting : t.payCardNow}
                          </button>
                          <p className="text-[12px] text-zinc-400 dark:text-zinc-500 text-center">{t.payCardNote}</p>
                          {error && (
                            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>
                          )}
                        </>
                      ) : (
                        <>
                      {activeMethod?.image && (
                        <div className="flex flex-col items-center gap-2 rounded-xl bg-white border border-zinc-200 dark:border-zinc-700 p-4">
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

                      {activeMethod && (
                        <div className="relative rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-4 py-3 text-[13px] text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap break-words">
                          {activeMethod.instructions}
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(activeMethod.instructions);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1500);
                            }}
                            className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-green-600"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? t.copied : t.copy}
                          </button>
                        </div>
                      )}

                      {activeMethod?.url && (
                        <a
                          href={activeMethod.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:opacity-90 active:scale-[0.98] transition"
                        >
                          <ExternalLink className="w-4 h-4" /> {t.payNow}
                        </a>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{t.ref}</label>
                        <input
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder={t.refPh}
                          className="w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">{t.note}</label>
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder={t.notePh}
                          className="w-full rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        />
                      </div>

                      {error && (
                        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</p>
                      )}

                      <button
                        onClick={submit}
                        disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-green-500 text-black text-sm font-bold hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {busy ? t.submitting : t.submit}
                      </button>
                        </>
                      )}
                    </>
                  )}
                  <button onClick={() => setStep('sell')} className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                    <ArrowLeft className="w-4 h-4" /> {t.back}
                  </button>
                </div>
              )}

              {/* ── Paso 3: recibido ── */}
              {step === 'done' && (
                <div className="text-center py-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/15 flex items-center justify-center mb-4">
                    <Clock className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">{t.doneBody}</p>
                  {config?.contact && (
                    <p className="text-[12px] text-zinc-400 mb-4">{t.contact} <span className="font-semibold">{config.contact}</span></p>
                  )}
                  <button onClick={onClose} className="w-full py-3.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold">
                    {t.close}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
