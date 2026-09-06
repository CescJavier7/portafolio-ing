'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Award,
  Loader2,
  Download,
  Link2,
  Check,
  Lock,
  LogIn,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { sentraGetAccessToken } from '@/lib/sentra/api';
import { openCertificatePdf, formatCertDate } from '@/lib/academiaCertPdf';

interface Cert {
  code: string;
  name: string;
  title: string;
  lessons: number;
  date: string;
}

type State = 'loading' | 'ok' | 'auth' | 'incomplete' | 'invalid' | 'error';

// Página del certificado, con dos modos:
//   · sin ?code → EMITIR: pide el certificado con el token (el servidor cruza
//     currículo real + progreso real; el cliente no decide nada).
//   · con ?code → VERIFICAR: público, recomputa el HMAC en el servidor. Así el
//     enlace que el usuario comparte lo puede comprobar cualquiera.
export default function CertificateView({
  track,
  trackTitle,
  lang,
}: {
  track: string;
  trackTitle: string;
  lang: string;
}) {
  const en = lang === 'en';
  const params = useSearchParams();
  const codeParam = params.get('code');

  const [state, setState] = useState<State>('loading');
  const [cert, setCert] = useState<Cert | null>(null);
  const [missing, setMissing] = useState({ missing: 0, total: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Modo verificación (público).
        if (codeParam) {
          const res = await fetch(
            `/api/academia/certificate?code=${encodeURIComponent(codeParam)}&lang=${lang}`,
          );
          if (!alive) return;
          if (!res.ok) return setState('invalid');
          const d = await res.json();
          setCert({ code: codeParam, name: d.name, title: d.title, lessons: d.lessons, date: d.date });
          return setState('ok');
        }

        // Modo emisión (requiere sesión).
        const token = sentraGetAccessToken();
        if (!token) return setState('auth');
        const res = await fetch('/api/academia/certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ track, lang }),
        });
        if (!alive) return;
        if (res.status === 401) return setState('auth');
        if (res.status === 403) {
          const d = await res.json().catch(() => ({}));
          setMissing({ missing: Number(d.missing ?? 0), total: Number(d.total ?? 0) });
          return setState('incomplete');
        }
        if (!res.ok) return setState('error');
        setCert(await res.json());
        setState('ok');
      } catch {
        if (alive) setState('error');
      }
    })();

    return () => {
      alive = false;
    };
  }, [codeParam, track, lang]);

  const verifyUrl = cert
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/${lang}/academia/${track}/certificado?code=${encodeURIComponent(cert.code)}`
    : '';

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sin portapapeles (http o permiso denegado): el enlace se ve abajo */
    }
  }, [verifyUrl]);

  const back = (
    <Link
      href={`/${lang}/academia/${track}`}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-green-600 dark:text-green-400 hover:underline"
    >
      <ArrowLeft className="w-3.5 h-3.5" /> {trackTitle}
    </Link>
  );

  if (state === 'loading') {
    return (
      <p className="flex items-center justify-center gap-2 text-zinc-400 py-24">
        <Loader2 className="w-5 h-5 animate-spin text-green-500" /> {en ? 'Loading…' : 'Cargando…'}
      </p>
    );
  }

  if (state !== 'ok' || !cert) {
    // 'ok' sin datos no debería ocurrir; cae en 'error' por seguridad.
    const boxKey: 'auth' | 'incomplete' | 'invalid' | 'error' =
      state === 'auth' || state === 'incomplete' || state === 'invalid' ? state : 'error';
    const box = {
      auth: {
        icon: <LogIn className="w-6 h-6 text-green-500" />,
        title: en ? 'Sign in to get your certificate' : 'Inicia sesión para obtener tu certificado',
        text: en
          ? 'Your progress lives in your account — sign in and we issue it on the spot.'
          : 'Tu progreso vive en tu cuenta — entra y lo emitimos al instante.',
        cta: { href: `/${lang}/sentinel/panel`, label: en ? 'Sign in' : 'Iniciar sesión' },
      },
      incomplete: {
        icon: <Lock className="w-6 h-6 text-amber-500" />,
        title: en ? 'Almost there' : 'Casi lo tienes',
        text: en
          ? `You have completed ${missing.total - missing.missing} of ${missing.total} lessons. Finish the track to unlock the certificate.`
          : `Llevas ${missing.total - missing.missing} de ${missing.total} lecciones. Termina la ruta para desbloquear el certificado.`,
        cta: { href: `/${lang}/academia/${track}`, label: en ? 'Continue the track' : 'Seguir la ruta' },
      },
      invalid: {
        icon: <ShieldAlert className="w-6 h-6 text-red-500" />,
        title: en ? 'Certificate not valid' : 'Certificado no válido',
        text: en
          ? 'This code does not match any certificate issued by the Academy.'
          : 'Este código no corresponde a ningún certificado emitido por la Academia.',
        cta: { href: `/${lang}/academia`, label: en ? 'Go to the Academy' : 'Ir a la Academia' },
      },
      error: {
        icon: <ShieldAlert className="w-6 h-6 text-red-500" />,
        title: en ? 'Something went wrong' : 'Algo salió mal',
        text: en ? 'Please try again in a moment.' : 'Inténtalo de nuevo en un momento.',
        cta: { href: `/${lang}/academia/${track}`, label: en ? 'Back to the track' : 'Volver a la ruta' },
      },
    }[boxKey];

    return (
      <div className="max-w-xl mx-auto px-4 pt-28 pb-24">
        {back}
        <div className="mt-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800/70 items-center justify-center mb-4">
            {box.icon}
          </span>
          <h1 className="text-xl font-black text-zinc-900 dark:text-white mb-2">{box.title}</h1>
          <p className="text-[15px] text-zinc-600 dark:text-zinc-400 mb-6">{box.text}</p>
          <Link
            href={box.cta.href}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:brightness-105 transition"
          >
            {box.cta.label}
          </Link>
        </div>
      </div>
    );
  }

  // ── Certificado válido ───────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-24">
      {back}

      {codeParam && (
        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/30 px-4 py-1.5 text-[13px] font-bold text-green-700 dark:text-green-400">
          <ShieldCheck className="w-4 h-4" /> {en ? 'Verified certificate' : 'Certificado verificado'}
        </p>
      )}

      {/* Vista del certificado (misma composición que el PDF) */}
      <div className="mt-6 rounded-3xl border-2 border-green-500/60 bg-white dark:bg-zinc-900/60 p-6 sm:p-10 text-center">
        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-green-600 dark:text-green-400">
          {en ? 'Academy' : 'Academia'} · cescjavier.dev
        </p>
        <p className="mt-6 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-zinc-400">
          {en ? 'Certificate of completion' : 'Certificado de finalización'}
        </p>
        <h1 className="mt-3 text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 dark:text-white break-words">
          {cert.name}
        </h1>
        <div className="w-24 h-px bg-zinc-200 dark:bg-zinc-700 mx-auto my-5" />
        <p className="text-[14px] sm:text-[15px] text-zinc-600 dark:text-zinc-400">
          {en
            ? 'has successfully completed the learning track'
            : 'ha completado satisfactoriamente la ruta de aprendizaje'}
        </p>
        <p className="mt-2 text-lg sm:text-2xl font-black text-green-700 dark:text-green-400">{cert.title}</p>
        <p className="mt-3 text-[12.5px] text-zinc-500 dark:text-zinc-400 tabular-nums">
          {cert.lessons} {en ? 'lessons' : 'lecciones'} · {formatCertDate(cert.date, lang)}
        </p>
        <span className="inline-flex w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/25 items-center justify-center mt-6">
          <Award className="w-6 h-6 text-green-600 dark:text-green-400" />
        </span>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => openCertificatePdf({ ...cert, verifyUrl }, lang)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:brightness-105 transition"
        >
          <Download className="w-4 h-4" /> {en ? 'Download PDF' : 'Descargar PDF'}
        </button>
        <button
          onClick={copyLink}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:border-green-400 transition"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
          {copied ? (en ? 'Link copied' : 'Enlace copiado') : en ? 'Copy verification link' : 'Copiar enlace de verificación'}
        </button>
      </div>

      <p className="mt-5 text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {en
          ? 'Anyone with this link can verify the certificate: it is signed by the server and cannot be forged.'
          : 'Cualquiera con este enlace puede verificar el certificado: va firmado por el servidor y no se puede falsificar.'}
      </p>
      <p className="mt-2 font-mono text-[11px] text-zinc-400 break-all select-all">{verifyUrl}</p>
    </div>
  );
}
