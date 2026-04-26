import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// 1. Función que busca todos los .md y extrae sus títulos y descripciones
function getPostMetadata() {
  const folder = path.join(process.cwd(), 'content/blog');
  
  // Verificamos si la carpeta existe para evitar errores
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
      slug: fileName.replace('.md', ''), // Le quita el .md para hacer la URL
    };
  });

  return posts;
}

export default function BlogIndex() {
  const posts = getPostMetadata();

  return (
    <main className="min-h-screen bg-[#f5f5f7] dark:bg-black transition-colors duration-500 py-24">
      <div className="max-w-4xl mx-auto px-6">
        
        <header className="mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-4">
            Blog & Educación.
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400">
            Artículos y publicaciones.
          </p>
        </header>

        {/* 2. Dibuja una tarjeta por cada archivo .md encontrado */}
        <div className="flex flex-col gap-6">
          {posts.length === 0 ? (
            <p className="text-zinc-500">Aún no hay artículos publicados.</p>
          ) : (
            posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
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
                    Leer artículo <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
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