'use client';

import { useEffect, useRef } from 'react';

/**
 * Auto-guardado tipo "borrador de Word": persiste `value` en localStorage con
 * debounce y lo restaura al montar si el estado está vacío. Si el usuario cierra
 * la pestaña por error, al volver recupera su texto.
 *
 * Nota de privacidad: esto vive SOLO en el navegador del usuario (localStorage),
 * nunca se envía a ningún servidor por sí mismo. Se limpia con clearDraft().
 */
export function useAutoSave(key: string, value: string, setValue: (v: string) => void) {
  const restored = useRef(false);

  // Restaurar una sola vez al montar (solo si el estado actual está vacío,
  // para no pisar algo que el componente ya haya cargado).
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved && !value) setValue(saved);
    } catch {
      /* localStorage bloqueado (incógnito estricto): se ignora */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar con debounce (500ms) para no escribir en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (value.trim()) localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      } catch {
        /* sin storage: no-op */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [key, value]);
}

export function clearDraft(...keys: string[]) {
  try {
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* no-op */
  }
}
