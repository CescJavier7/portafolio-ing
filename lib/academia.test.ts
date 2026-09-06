import { describe, it, expect } from 'vitest';
import { getLesson, getTrackLessons } from './academia';

// El currículo es la fuente de verdad del certificado, así que el lector del
// Markdown (y el parseo del quiz) merece red de seguridad.
describe('academia · lector de lecciones', () => {
  it('lee las lecciones de un track ordenadas por `order`', () => {
    const lessons = getTrackLessons('ciberseguridad', 'es');
    expect(lessons.length).toBeGreaterThan(0);
    const orders = lessons.map((l) => l.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('el slug quita el prefijo NN- del archivo', () => {
    const lessons = getTrackLessons('ciberseguridad', 'es');
    for (const l of lessons) expect(l.slug).not.toMatch(/^\d+-/);
  });

  it('parsea el quiz del frontmatter con respuestas válidas', () => {
    const lesson = getLesson('ciberseguridad', 'owasp-top-10', 'es');
    expect(lesson).not.toBeNull();
    expect(lesson!.quiz.length).toBeGreaterThanOrEqual(3);
    for (const q of lesson!.quiz) {
      expect(q.q).not.toBe('');
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      // El índice de la respuesta SIEMPRE cae dentro de las opciones.
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.options.length);
    }
  });

  it('una lección sin quiz devuelve una lista vacía (nunca undefined)', () => {
    const lessons = getTrackLessons('ciberseguridad', 'es');
    for (const meta of lessons) {
      const l = getLesson('ciberseguridad', meta.slug, 'es');
      expect(Array.isArray(l!.quiz)).toBe(true);
    }
  });

  it('devuelve null para una lección inexistente', () => {
    expect(getLesson('ciberseguridad', 'no-existe-jamas', 'es')).toBeNull();
  });
});
