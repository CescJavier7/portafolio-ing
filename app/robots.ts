import { MetadataRoute } from 'next';

const BASE = 'https://cescjavier.dev';

// robots.txt dinámico. Regla clave de SEO aplicada aquí:
//
// - `/api/*` se BLOQUEA: son rutas internas (chat, NextAuth, reportes) que
//   devuelven JSON, no páginas. Google las descubre porque su crawler ejecuta
//   el JS y ve los `fetch('/api/...')`. Bloquearlas es lo CORRECTO; el aviso
//   "Bloqueada por robots.txt" de Search Console es INFORMATIVO, no un error,
//   y no afecta el ranking de las páginas reales.
//
// - Las páginas PRIVADAS (panel, login, register, accept-invite, /meka-admin)
//   NO se bloquean aquí a propósito: usan la etiqueta `noindex`. Si se
//   bloquearan por robots.txt, Google no podría leer ese `noindex` (no puede
//   entrar) y podrían quedar en el índice como "sin descripción". noindex >
//   robots-disallow para mantener páginas FUERA del índice.
//
// - Todo lo demás (home, /services, /sentinel, /herramientas/cv, /blog, legal…)
//   queda indexable y está listado en el sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
