import { MetadataRoute } from 'next';

const BASE = 'https://cescjavier.dev';

// Rutas públicas e indexables. Se excluyen a propósito las privadas o con
// noindex: panel, login, register, accept-invite.
const PATHS: { path: string; priority: number; freq: 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1.0, freq: 'monthly' },
  { path: '/services', priority: 0.8, freq: 'monthly' },
  { path: '/sentinel', priority: 0.9, freq: 'weekly' },
  { path: '/sentinel/scan', priority: 0.9, freq: 'weekly' }, // escáner gratis: gancho de SEO
  { path: '/sentinel/precios', priority: 0.7, freq: 'monthly' },
  { path: '/sentinel/seguridad', priority: 0.6, freq: 'monthly' },
  { path: '/blog', priority: 0.8, freq: 'weekly' },
  { path: '/legal/terminos', priority: 0.3, freq: 'monthly' },
  { path: '/legal/privacidad', priority: 0.3, freq: 'monthly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const { path, priority, freq } of PATHS) {
    for (const lang of ['es', 'en']) {
      entries.push({
        url: `${BASE}/${lang}${path}`,
        lastModified: now,
        changeFrequency: freq,
        priority,
        // hreflang: le dice a Google que es/en son la misma página en dos
        // idiomas, para que no compitan entre sí en el ranking.
        alternates: {
          languages: {
            es: `${BASE}/es${path}`,
            en: `${BASE}/en${path}`,
          },
        },
      });
    }
  }

  // Artículo de blog existente.
  entries.push({
    url: `${BASE}/es/blog/nids-ips-defense`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.7,
  });

  return entries;
}
