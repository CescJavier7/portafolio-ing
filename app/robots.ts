import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // Protege tus rutas internas
    },
    sitemap: 'https://cescjavier.dev/sitemap.xml',
  };
}