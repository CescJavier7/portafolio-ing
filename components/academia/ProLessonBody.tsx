'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock, Loader2, LogIn, Sparkles } from 'lucide-react';
import LessonMarkdown from '@/components/academia/LessonMarkdown';
import LessonQuiz from '@/components/academia/LessonQuiz';
import type { QuizQuestion } from '@/lib/academia';
import { sentraGetAccessToken } from '@/lib/sentra/api';

// Cuerpo de una lección PRO: lo pide autenticado a /api/academia/lesson (el
// servidor solo lo devuelve si el usuario es Pro). Si no, muestra el paywall.
export default function ProLessonBody({
  track,
  lesson,
  lang,
  slug,
}: {
  track: string;
  lesson: string;
  lang: string;
  slug: string;
}) {
  const en = lang === 'en';
  const [state, setState] = useState<'loading' | 'ok' | 'auth' | 'pro' | 'error'>('loading');
  const [content, setContent] = useState('');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = sentraGetAccessToken();
      try {
        const res = await fetch(
          `/api/academia/lesson?track=${encodeURIComponent(track)}&lesson=${encodeURIComponent(lesson)}&lang=${lang}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        if (!alive) return;
        if (res.status === 401) return setState('auth');
        if (res.status === 403) return setState('pro');
        if (!res.ok) return setState('error');
        const data = await res.json();
        setContent(String(data.content ?? ''));
        setQuiz(Array.isArray(data.quiz) ? data.quiz : []);
        setState('ok');
      } catch {
        if (alive) setState('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, [track, lesson, lang]);

  if (state === 'loading') {
    return (
      <p className="flex items-center gap-2 text-zinc-400 py-16 justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-green-500" /> {en ? 'Loading…' : 'Cargando…'}
      </p>
    );
  }

  if (state === 'ok') {
    return (
      <>
        <LessonMarkdown content={content} />
        <LessonQuiz questions={quiz} slug={slug} lang={lang} />
      </>
    );
  }

  if (state === 'error') {
    return <p className="text-red-500 py-10">{en ? 'Could not load the lesson.' : 'No se pudo cargar la lección.'}</p>;
  }

  // Paywall (auth | pro)
  const isAuth = state === 'auth';
  return (
    <div className="my-10 rounded-3xl border border-green-500/25 bg-gradient-to-b from-green-500/5 to-transparent p-8 md:p-10 text-center">
      <span className="inline-flex w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-green-500" />
      </span>
      <h3 className="text-xl font-black text-zinc-900 dark:text-white mb-2">
        {isAuth ? (en ? 'Sign in to continue' : 'Inicia sesión para continuar') : en ? 'Included in Pro' : 'Incluida en el plan Pro'}
      </h3>
      <p className="text-[15px] text-zinc-600 dark:text-zinc-400 max-w-md mx-auto mb-6">
        {isAuth
          ? en
            ? 'This lesson is part of the Academy. Sign in to your account to keep going.'
            : 'Esta lección es parte de la Academia. Entra a tu cuenta para seguir.'
          : en
          ? 'The Academy is included in the all-in-one Pro plan (USD 10/mo) — with Sentra and Sentra CV AI. One payment, three tools.'
          : 'La Academia va incluida en el plan Pro todo-en-uno (USD 10/mes) — junto a Sentra y Sentra CV AI. Un pago, tres herramientas.'}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {isAuth ? (
          <Link
            href={`/${lang}/sentinel/panel`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:brightness-105 transition"
          >
            <LogIn className="w-4 h-4" /> {en ? 'Sign in' : 'Iniciar sesión'}
          </Link>
        ) : (
          <Link
            href={`/${lang}/sentinel/precios`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:brightness-105 transition"
          >
            <Sparkles className="w-4 h-4" /> {en ? 'Unlock with Pro' : 'Desbloquear con Pro'}
          </Link>
        )}
      </div>
    </div>
  );
}
