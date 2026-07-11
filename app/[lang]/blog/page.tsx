// Archivo: app/[lang]/blog/page.tsx
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// ─── TIPADO ───────────────────────────────────────────────────────────────────
interface BlogIndexDictionary {
  heading: string;
  subheading: string;
  empty: string;
  readMore: string;
}

interface PostMeta {
  title: string;
  date: string;
  category: string;
  description: string;
  slug: string;
}

// Lee ÚNICAMENTE los posts del idioma actual (content/blog/{lang}/*.md).
// Antes esta función ignoraba el segmento [lang] de la ruta y mezclaba
// artículos en inglés y español en la misma lista, sin importar en qué
// idioma estuviera el usuario — por eso en /es/blog aparecían títulos en
// inglés (o nada, según el orden de lectura de carpetas).
function getPostMetadata(lang: string): PostMeta[] {
  const folder = path.join(process.cwd(), 'content/blog', lang);

  if (!fs.existsSync(folder)) {
    return [];
  }

  const files = fs.readdirSync(folder);
  const markdownPosts = files.filter((file) => file.endsWith('.md'));

  const posts = markdownPosts.map((fileName) => {
    const fileContents = fs.readFileSync(path.join(folder, fileName), 'utf8');
    const matterResult = matter(fileContents);
    return {
      title: matterResult.data.title || 'Sin título',
      date: matterResult.data.date || '',
      category: matterResult.data.category || 'General',
      description: matterResult.data.description || '',
      slug: fileName.replace('.md', ''),
    };
  });

  // Más recientes primero
  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export default async function BlogIndex({
  params,
}: {
  params: Promise<{ lang: 'es' | 'en' }>;
}) {
  const { lang } = await params;
  const posts = getPostMetadata(lang);

  // Mismo patrón "mini-diccionario local" que ya usamos en blog/[slug]/page.tsx,
  // para no forzar a esta ruta a cargar el diccionario global completo solo
  // por 4 strings de interfaz.
  const ui: BlogIndexDictionary =
    lang === 'en'
      ? {
          heading: 'Blog & Education.',
          subheading: 'Articles and publications.',
          empty: 'No articles published yet.',
          readMore: 'Read article',
        }
      : {
          heading: 'Blog & Educación.',
          subheading: 'Artículos y publicaciones.',
          empty: 'Aún no hay artículos publicados.',
          readMore: 'Leer artículo',
        };

  return (
    <main className="min-h-screen bg-[#f5f5f7] dark:bg-black transition-colors duration-500 py-24">
      <div className="max-w-4xl mx-auto px-6">
        
        <header className="mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-4">
            {ui.heading}
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400">
            {ui.subheading}
          </p>
        </header>

        <div className="flex flex-col gap-6">
          {posts.length === 0 ? (
            <p className="text-zinc-500">{ui.empty}</p>
          ) : (
            posts.map((post) => (
              <Link key={post.slug} href={`/${lang}/blog/${post.slug}`} className="group block">
                <article className="bg-white dark:bg-[#1d1d1f] p-8 md:p-10 rounded-[2.5rem] border border-zinc-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 transform group-hover:-translate-y-1">
                  
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-full bg-apple-blue/10 text-apple-blue text-xs font-bold uppercase tracking-widest">
                      {post.category}
                    </span>
                    <span className="text-zinc-400 text-sm font-medium">{post.date}</span>
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3 group-hover:text-apple-blue transition-colors">
                    {post.title}
                  </h2>
                  
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6 line-clamp-2">
                    {post.description}
                  </p>
                  
                  <div className="flex items-center gap-2 text-apple-blue font-semibold text-sm">
                    {ui.readMore} <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </article>
              </Link>
            ))
          )}
        </div>

      </div>
    </main>
  );
}