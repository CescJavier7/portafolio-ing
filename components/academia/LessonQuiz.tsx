'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Trophy, HelpCircle, Loader2 } from 'lucide-react';
import type { QuizQuestion } from '@/lib/academia';
import { sentraGetAccessToken, sentraSetLessonProgress } from '@/lib/sentra/api';

// Evento con el que el quiz avisa al botón de progreso (LessonComplete) de que
// la lección quedó completada, sin acoplar los dos componentes.
export const LESSON_COMPLETED_EVENT = 'academia:lesson-completed';

const PASS_RATIO = 0.7; // 70% para aprobar

/**
 * Quiz de una lección (declarado en el frontmatter del .md).
 *
 * Es formativo, no un examen: las respuestas viajan con la lección, así que la
 * corrección es en cliente (instantánea y sin coste). Lo que SÍ es servidor es
 * el gating del contenido Pro (el quiz de una lección Pro llega por la API
 * autenticada) y el certificado, que se emite verificando el progreso real.
 */
export default function LessonQuiz({
  questions,
  slug,
  lang,
}: {
  questions: QuizQuestion[];
  slug: string;
  lang: string;
}) {
  const en = lang === 'en';
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [graded, setGraded] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = questions.length;
  const answered = Object.keys(picks).length;
  const correct = useMemo(
    () => questions.reduce((n, q, i) => n + (picks[i] === q.answer ? 1 : 0), 0),
    [picks, questions],
  );
  const passed = total > 0 && correct / total >= PASS_RATIO;

  if (total === 0) return null;

  async function grade() {
    setGraded(true);
    const ok = correct / total >= PASS_RATIO;
    // Aprobar marca la lección como completada en la cuenta (si hay sesión).
    if (ok && sentraGetAccessToken()) {
      setSaving(true);
      try {
        await sentraSetLessonProgress(slug, true);
        window.dispatchEvent(new CustomEvent(LESSON_COMPLETED_EVENT, { detail: slug }));
      } catch {
        /* el usuario siempre puede marcarla a mano abajo */
      } finally {
        setSaving(false);
      }
    }
  }

  function retry() {
    setPicks({});
    setGraded(false);
  }

  return (
    <section
      aria-label={en ? 'Lesson quiz' : 'Quiz de la lección'}
      className="mt-14 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-5 sm:p-7"
    >
      <header className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 shrink-0 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
            {en ? 'Check what you learned' : 'Comprueba lo aprendido'}
          </h2>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {en
              ? `${total} questions · 70% to pass · unlimited retries`
              : `${total} preguntas · 70% para aprobar · reintentos ilimitados`}
          </p>
        </div>
      </header>

      <ol className="space-y-7">
        {questions.map((q, qi) => {
          const pick = picks[qi];
          return (
            <li key={qi}>
              <fieldset>
                <legend className="text-[15px] font-bold text-zinc-900 dark:text-white leading-snug mb-3">
                  <span className="text-green-600 dark:text-green-400 tabular-nums mr-1.5">{qi + 1}.</span>
                  {q.q}
                </legend>

                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const isPick = pick === oi;
                    const isRight = q.answer === oi;
                    // Tras corregir: la correcta en verde; la elegida errónea en rojo.
                    let state = 'border-zinc-200 dark:border-zinc-800 hover:border-green-400';
                    if (graded && isRight) state = 'border-green-500 bg-green-500/10';
                    else if (graded && isPick) state = 'border-red-500 bg-red-500/10';
                    else if (isPick) state = 'border-green-500 bg-green-500/10';

                    return (
                      <label
                        key={oi}
                        className={`flex items-start gap-3 rounded-2xl border bg-white dark:bg-zinc-900/60 px-4 py-3 transition-colors ${state} ${
                          graded ? 'cursor-default' : 'cursor-pointer'
                        } has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green-500/60`}
                      >
                        <input
                          type="radio"
                          name={`q-${slug}-${qi}`}
                          className="sr-only"
                          checked={isPick}
                          disabled={graded}
                          onChange={() => setPicks((p) => ({ ...p, [qi]: oi }))}
                        />
                        <span
                          className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                            isPick || (graded && isRight)
                              ? 'border-green-500'
                              : 'border-zinc-300 dark:border-zinc-600'
                          }`}
                        >
                          {(isPick || (graded && isRight)) && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                graded && isPick && !isRight ? 'bg-red-500' : 'bg-green-500'
                              }`}
                            />
                          )}
                        </span>
                        <span className="text-[14.5px] text-zinc-700 dark:text-zinc-200 leading-snug">{opt}</span>
                        {graded && isRight && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 ml-auto mt-0.5" />
                        )}
                        {graded && isPick && !isRight && (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-auto mt-0.5" />
                        )}
                      </label>
                    );
                  })}
                </div>

                {graded && q.explain && (
                  <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-400 border-l-2 border-green-500/50 pl-3">
                    {q.explain}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="mt-7 pt-5 border-t border-zinc-200 dark:border-zinc-800">
        {!graded ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={grade}
              disabled={answered < total}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-500 text-black text-sm font-bold hover:brightness-105 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {en ? 'Check answers' : 'Corregir'}
            </button>
            <span className="text-[13px] text-zinc-500 dark:text-zinc-400 tabular-nums">
              {answered}/{total} {en ? 'answered' : 'respondidas'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 flex-1 ${
                passed
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-amber-500/10 border border-amber-500/30'
              }`}
            >
              {passed ? (
                <Trophy className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-zinc-900 dark:text-white tabular-nums">
                  {correct}/{total} · {Math.round((correct / total) * 100)}%
                  {saving && <Loader2 className="inline w-3.5 h-3.5 animate-spin ml-2 text-green-500" />}
                </p>
                <p className="text-[12.5px] text-zinc-600 dark:text-zinc-400">
                  {passed
                    ? en
                      ? 'Passed — lesson marked as complete.'
                      : 'Aprobado — lección marcada como completada.'
                    : en
                    ? 'Review the explanations and try again.'
                    : 'Revisa las explicaciones e inténtalo de nuevo.'}
                </p>
              </div>
            </div>
            <button
              onClick={retry}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:border-green-400 transition shrink-0"
            >
              <RotateCcw className="w-4 h-4" /> {en ? 'Retry' : 'Reintentar'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
