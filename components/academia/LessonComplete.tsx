'use client';

import { useEffect, useState } from 'react';
import { Check, Circle, Loader2 } from 'lucide-react';
import { sentraGetAccessToken, sentraGetAcademyProgress, sentraSetLessonProgress } from '@/lib/sentra/api';

// Botón de progreso: marca/desmarca la lección como completada (guardado en la
// cuenta del usuario). Sin sesión no se muestra.
export default function LessonComplete({ slug, lang }: { slug: string; lang: string }) {
  const en = lang === 'en';
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const token = sentraGetAccessToken();
    if (!token) return;
    setLoggedIn(true);
    sentraGetAcademyProgress()
      .then((p) => setDone(p.completed.includes(slug)))
      .catch(() => {});
  }, [slug]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !done;
    setDone(next); // optimista
    try {
      await sentraSetLessonProgress(slug, next);
    } catch {
      setDone(!next); // revertir si falla
    } finally {
      setBusy(false);
    }
  }

  if (!loggedIn) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition ${
        done
          ? 'bg-green-500 text-black hover:brightness-105'
          : 'border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-green-400'
      }`}
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
      {done ? (en ? 'Completed' : 'Completada') : en ? 'Mark as complete' : 'Marcar como completada'}
    </button>
  );
}
