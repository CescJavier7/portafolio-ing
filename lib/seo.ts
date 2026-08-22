// lib/seo.ts
// Helper SEO: canonical + hreflang POR PÁGINA. Se usa en el `alternates` de cada
// page.tsx, porque el layout no puede saber la ruta (ver app/[lang]/layout.tsx).
//
// Regla: canonical = la URL de ESTA página en ESTE idioma; hreflang enlaza las
// dos versiones (es/en) + x-default (es) para que no compitan en el ranking.
import type { Metadata } from 'next';

export const SITE_URL = 'https://cescjavier.dev';

/**
 * @param path Ruta SIN el prefijo de idioma, empezando por "/" (ej. "/sentinel/precios").
 *             Para la home usa "" (cadena vacía).
 * @param lang "es" | "en"
 */
export function altLangs(path: string, lang: string): NonNullable<Metadata['alternates']> {
  const p = path === '/' ? '' : path;
  return {
    canonical: `${SITE_URL}/${lang}${p}`,
    languages: {
      es: `${SITE_URL}/es${p}`,
      en: `${SITE_URL}/en${p}`,
      'x-default': `${SITE_URL}/es${p}`,
    },
  };
}
