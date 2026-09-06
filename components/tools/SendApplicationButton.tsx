'use client';

import { useEffect, useState } from 'react';
import { Send, Loader2, Check, Mail } from 'lucide-react';
import {
  sentraApplyEmail,
  sentraUpdateApplication,
  type CVContent,
  type SentraApplyEmail,
} from '@/lib/sentra/api';
import { openCVPdf, defaultPdfLabels } from '@/lib/sentra/cvPdf';
import { useSentraSession } from '@/lib/sentra/useSession';

// Cierra el ciclo "aplicar": abre el correo de postulación ya redactado (con
// destinatario), descarga el CV en PDF para adjuntar, y marca la postulación como
// POSTULADA en el tracker. Human-in-the-loop: el usuario revisa y pulsa Enviar en
// su cliente de correo — nosotros nunca enviamos nada por su cuenta.
//
// El correo se PRE-GENERA al montar: así el clic no hace `await` y el navegador no
// bloquea la ventana de Gmail (mismo criterio que ApplyEmailButton del wizard).
export default function SendApplicationButton({
  cvId,
  cvContent,
  applicationId,
  lang,
  fallbackRole,
}: {
  cvId: string;
  cvContent: CVContent;
  applicationId?: string | null;
  lang: string;
  fallbackRole?: string;
}) {
  const en = lang === 'en';
  const { user } = useSentraSession();
  const isPaid = user?.plan === 'PRO' || user?.plan === 'TEAM' || user?.plan === 'ENTERPRISE';

  const [email, setEmail] = useState<SentraApplyEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    sentraApplyEmail(cvId)
      .then((e) => alive && setEmail(e))
      .catch(() => alive && setEmail(null)) // el endpoint ya trae fallback; si falla, usamos el nuestro
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cvId]);

  // Fallback local por si la API no respondió: correo formal mínimo, con saludo.
  const subject =
    email?.subject?.trim() ||
    `${en ? 'Application' : 'Postulación'} — ${fallbackRole || cvContent.headline || cvContent.full_name}`.trim();
  const body =
    email?.body?.trim() ||
    [
      en ? 'Dear Hiring Team,' : 'Estimado equipo de reclutamiento,',
      '',
      en
        ? `I am writing to apply for the ${fallbackRole || cvContent.headline || 'advertised'} position.`
        : `Me dirijo a ustedes para postular a la vacante de ${fallbackRole || cvContent.headline || 'su publicación'}.`,
      '',
      cvContent.summary || '',
      '',
      en ? 'I look forward to your reply. Best regards,' : 'Quedo atento/a a su respuesta. Un cordial saludo,',
      cvContent.full_name || '',
    ]
      .join('\n')
      .trim();
  const to = email?.recipient?.trim() || '';

  function send() {
    // 1) PDF + Gmail SIN await previo → ocurre dentro del gesto del usuario.
    openCVPdf(cvContent, defaultPdfLabels(lang), { hideWatermark: isPaid });
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    // 2) Marcar como postulada en el tracker (best-effort, ya fuera del gesto).
    setSent(true);
    if (applicationId) {
      sentraUpdateApplication(applicationId, { status: 'applied' }).catch(() => {});
    }
  }

  if (sent) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-green-600 dark:text-green-400">
          <Check className="w-4 h-4" /> {en ? 'Marked as applied' : 'Marcada como postulada'}
        </span>
        <button onClick={send} className="text-[12px] font-semibold text-zinc-500 hover:underline">
          {en ? 'Open the email again' : 'Abrir el correo de nuevo'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={send}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-black text-[13px] font-black hover:brightness-105 active:scale-[0.98] disabled:opacity-60 transition"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {loading ? (en ? 'Drafting…' : 'Redactando…') : en ? 'Send application' : 'Enviar postulación'}
      </button>
      <span className="text-[12px] text-zinc-500 dark:text-zinc-400">
        {to ? (
          <span className="inline-flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> {to}
          </span>
        ) : en ? (
          'Opens your email with the CV attached (add the recipient).'
          ) : (
          'Abre tu correo con el CV listo para adjuntar (pon el destinatario).'
        )}
      </span>
    </div>
  );
}
