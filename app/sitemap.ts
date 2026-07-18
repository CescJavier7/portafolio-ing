import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://cescjavier.dev';
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  // Home, Servicios y la landing de Sentra en ambos idiomas: son las páginas
  // de marketing que SÍ queremos indexar en Google. Las de app (panel/login/
  // register) quedan fuera a propósito (llevan robots noindex).
  for (const lang of ['es', 'en']) {
    entries.push(
      { url: `${baseUrl}/${lang}`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
      { url: `${baseUrl}/${lang}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
      { url: `${baseUrl}/${lang}/sentinel`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
      { url: `${baseUrl}/${lang}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    );
  }

  entries.push({
    url: `${baseUrl}/es/blog/nids-ips-defense`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.7,
  });

  return entries;
}