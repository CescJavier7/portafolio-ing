// lib/sentra/matchScore.ts
//
// Paleta ÚNICA del Match Score (antes duplicada como `matchColor` en dos
// componentes). Tonos "joya" sobrios y profesionales, en vez del semáforo
// verde/amarillo/rojo saturado: emerald / amber / rose, cada uno con su tinte
// translúcido para el aro del score.

export function matchColor(score: number): string {
  if (score >= 80) return '#059669'; // emerald-600 — excelente
  if (score >= 55) return '#b45309'; // amber-700  — parcial
  return '#be123c'; // rose-700 — bajo
}

// Fondo translúcido a juego (para el aro/badge del score).
export function matchTint(score: number): string {
  if (score >= 80) return 'rgba(5, 150, 105, 0.10)';
  if (score >= 55) return 'rgba(180, 83, 9, 0.10)';
  return 'rgba(190, 18, 60, 0.10)';
}
