import fs from 'fs';
import path from 'path';
import { MetadataRoute } from 'next';

const BASE = 'https://cescjavier.dev';

// Lee los slugs reales de los artículos (content/blog/es/*.md). Así el sitemap
// se mantiene solo: cada artículo nuevo entra sin tocar este archivo.
function blogSlugs(): string[] {
  try {
    const folder = path.join(process.cwd(), 'content/blog', 'es');
    return fs
      .readdirSync(folder)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.replace('.md', ''));
  } catch {
    return [];
  }
}

// Rutas públicas e indexables. Se excluyen a propósito las privadas o con
// noindex: panel, login, register, accept-invite.
const PATHS: { path: string; priority: number; freq: 'weekly' | 'monthly' }[] = [
  { path: '', priority: 1.0, freq: 'monthly' },
  { path: '/services', priority: 0.8, freq: 'monthly' },
  { path: '/sentinel', priority: 0.9, freq: 'weekly' },
  { path: '/sentinel/scan', priority: 0.9, freq: 'weekly' }, // escáner gratis: gancho de SEO
  { path: '/sentinel/precios', priority: 0.7, freq: 'monthly' },
  { path: '/sentinel/seguridad', priority: 0.6, freq: 'monthly' },
  { path: '/herramientas/cv', priority: 0.8, freq: 'monthly' }, // generador de CV (gancho SEO)
  { path: '/academia', priority: 0.6, freq: 'monthly' }, // academia (en desarrollo)
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

  // Artículos del blog (ambos idiomas, con hreflang).
  for (const slug of blogSlugs()) {
    for (const lang of ['es', 'en']) {
      entries.push({
        url: `${BASE}/${lang}/blog/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: {
            es: `${BASE}/es/blog/${slug}`,
            en: `${BASE}/en/blog/${slug}`,
          },
        },
      });
    }
  }

  return entries;
}
