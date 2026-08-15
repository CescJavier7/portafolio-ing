'use client';

import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export interface CVTourDict {
  next: string;
  prev: string;
  done: string;
  profileTitle: string;
  profileBody: string;
  jobTitle: string;
  jobBody: string;
  generateTitle: string;
  generateBody: string;
}

const TOUR_FLAG = 'cv_tour_done';

/**
 * Tour interactivo del generador de CV (driver.js). Se ejecuta UNA sola vez por
 * navegador (flag en localStorage) y solo cuando la herramienta ya está montada
 * (los elementos ancla #cv-profile / #cv-job / #cv-generate existen), es decir,
 * con el usuario logueado. No renderiza nada (return null): driver.js maneja su
 * propio overlay/portal en el DOM, fuera del árbol de React — por eso no pelea
 * con la hidratación del App Router.
 */
export default function CVTour({ dict, active }: { dict: CVTourDict; active: boolean }) {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    if (localStorage.getItem(TOUR_FLAG)) return;

    // Espera un frame a que el formulario esté en el DOM antes de anclar.
    const raf = requestAnimationFrame(() => {
      if (!document.getElementById('cv-profile')) return;

      const d = driver({
        showProgress: true,
        allowClose: true,
        overlayColor: 'rgba(0,0,0,0.6)',
        nextBtnText: dict.next,
        prevBtnText: dict.prev,
        doneBtnText: dict.done,
        steps: [
          { element: '#cv-profile', popover: { title: dict.profileTitle, description: dict.profileBody, side: 'bottom', align: 'start' } },
          { element: '#cv-job', popover: { title: dict.jobTitle, description: dict.jobBody, side: 'bottom', align: 'start' } },
          { element: '#cv-generate', popover: { title: dict.generateTitle, description: dict.generateBody, side: 'top', align: 'center' } },
        ],
        onDestroyed: () => {
          try {
            localStorage.setItem(TOUR_FLAG, '1');
          } catch {
            /* modo incógnito sin storage: no pasa nada, el tour solo no se "recuerda" */
          }
        },
      });
      d.drive();
    });

    return () => cancelAnimationFrame(raf);
  }, [active, dict]);

  return null;
}
