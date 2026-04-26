// Archivo: app/blog/[slug]/page.tsx
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ArrowLeft, Share2, Bookmark } from 'lucide-react';

function getPostContent(slug: string) {
  const folder = path.join(process.cwd(), 'content/blog');
  const file = path.join(folder, `${slug}.md`);
  const content = fs.readFileSync(file, 'utf8');
  return matter(content);
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const post = getPostContent(resolvedParams.slug);

  return (
    <main className="min-h-screen bg-white dark:bg-black transition-colors duration-500 antialiased">
      
      {/* NAVEGACIÓN SUPERIOR (Apple Style Blur) */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 text-zinc-500 hover:text-apple-blue transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            <span>Volver</span>
          </Link>
          <div className="flex gap-4 text-zinc-400">
            <Share2 size={18} className="cursor-pointer hover:text-zinc-900 dark:hover:text-white" />
            <Bookmark size={18} className="cursor-pointer hover:text-zinc-900 dark:hover:text-white" />
          </div>
        </div>
      </nav>

      {/* CUERPO DEL ARTÍCULO */}
      <article className="max-w-3xl mx-auto px-6 py-20 md:py-32">
        
        {/* CABECERA */}
        <header className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <span className="px-3 py-1 rounded-full bg-apple-blue/10 text-apple-blue text-[10px] font-bold uppercase tracking-widest">
              {post.data.category}
            </span>
            <span className="text-zinc-400 text-xs font-medium">{post.data.date}</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-8 leading-[1.05]">
            {post.data.title}
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-500 dark:text-zinc-400 font-medium leading-tight border-l-2 border-zinc-200 dark:border-zinc-800 pl-6 py-2 italic">
            {post.data.description}
          </p>
        </header>

        {/* CONTENIDO (Estilizado manualmente para elegancia pura) */}
        <div className="prose-container">
          <ReactMarkdown
            components={{
              // Estilo para encabezados
              h2: ({ ...props }) => <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mt-16 mb-6" {...props} />,
              h3: ({ ...props }) => <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-12 mb-4" {...props} />,
              // Estilo para párrafos (la clave del Apple Style)
              p: ({ ...props }) => <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-[1.7] mb-8 font-medium" {...props} />,
              // Estilo para listas
              ul: ({ ...props }) => <ul className="list-none space-y-4 mb-10 pl-0" {...props} />,
              li: ({ ...props }) => (
                <li className="flex items-start gap-4 text-zinc-600 dark:text-zinc-400 text-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-apple-blue mt-2.5 shrink-0" />
                  <span {...props} />
                </li>
              ),
              // Estilo para negritas
              strong: ({ ...props }) => <strong className="text-zinc-900 dark:text-white font-bold" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        {/* PIE DE ARTÍCULO (Firma técnica) */}
        <footer className="mt-24 pt-12 border-t border-zinc-100 dark:border-white/10">
          <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2.5rem]">
            <div className="w-16 h-16 rounded-full bg-apple-blue flex items-center justify-center text-white font-bold text-xl">
              CJ
            </div>
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white">Escrito por CescJavier7</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Ingeniero en Ciberseguridad y Docente. Apasionado por la educación tecnológica con propósito científico.</p>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}