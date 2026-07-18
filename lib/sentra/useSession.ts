'use client';

// Hook compartido de sesión de Sentra. Un solo lugar para la lógica
// "¿quién está logueado?": NavBar, landing, login/register y panel la
// reutilizan en vez de duplicarla. Se re-verifica solo cuando cambia la
// sesión (evento SENTRA_AUTH_EVENT), no en cada render.
import { useCallback, useEffect, useState } from 'react';
import {
  SENTRA_AUTH_EVENT,
  sentraHasToken,
  sentraIsKnownUser,
  sentraMe,
  sentraRefresh,
  type SentraUser,
} from '@/lib/sentra/api';

export function useSentraSession() {
  const [user, setUser] = useState<SentraUser | null>(null);
  const [checking, setChecking] = useState(true);

  const bootstrap = useCallback(async () => {
    // Anónimo que nunca inició sesión en este navegador: cero requests.
    if (!sentraHasToken() && !sentraIsKnownUser()) {
      setUser(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      if (!sentraHasToken()) {
        const alive = await sentraRefresh();
        if (!alive) {
          setUser(null);
          return;
        }
      }
      try {
        setUser(await sentraMe());
      } catch {
        // Token vencido: un intento de refresh y reintento único.
        const alive = await sentraRefresh();
        setUser(alive ? await sentraMe() : null);
      }
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
    window.addEventListener(SENTRA_AUTH_EVENT, bootstrap);
    return () => window.removeEventListener(SENTRA_AUTH_EVENT, bootstrap);
  }, [bootstrap]);

  return { user, checking };
}
