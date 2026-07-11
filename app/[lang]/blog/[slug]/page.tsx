// Archivo: app/[lang]/blog/[slug]/page.tsx
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // <--- Importante para que funcionen las tablas
import Link from 'next/link';
import { ArrowLeft, Share2, Bookmark } from 'lucide-react';

// ─── TIPADO DEL DICCIONARIO (mínimo necesario para esta página) ──────────────
interface BlogPostDictionary {
  back: string;
  writtenBy: string;
  authorBio: string;
}

// Lee el markdown del artículo desde la carpeta específica del idioma.
// content/blog/es/{slug}.md  |  content/blog/en/{slug}.md
// Si el artículo no existe traducido en ese idioma, hacemos fallback a
// español para no romper la página (mejor mostrar el original que un 404).
function getPostContent(lang: string, slug: string) {
  const folder = path.join(process.cwd(), 'content/blog', lang);
  let file = path.join(folder, `${slug}.md`);

  if (!fs.existsSync(file)) {
    file = path.join(process.cwd(), 'content/blog', 'es', `${slug}.md`);
  }

  const content = fs.readFileSync(file, 'utf8');
  return matter(content);
}

export default async function BlogPost({
  params,
}: {
  // Mismo ajuste que en layout.tsx: Next.js 16 espera `string` genérico
  // para segmentos dinámicos en el tipo auto-generado; declarar la unión
  // 'es' | 'en' aquí rompe el build ("does not satisfy the constraint").
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang: rawLang, slug } = await params;
  const lang: 'es' | 'en' = rawLang === 'en' ? 'en' : 'es';
  const post = getPostContent(lang, slug);

  // Copys de interfaz mínimos (no ameritan traer todo `getDictionary` aquí,
  // pero siguen el mismo patrón: texto fijo por locale, con fallback seguro).
  const ui: BlogPostDictionary =
    lang === 'en'
      ? {
          back: 'Back',
          writtenBy: 'Written by Kevin Montatixe',
          authorBio: 'Cybersecurity Engineer & Educator. Focused on technical rigor and active infrastructure defense.',
        }
      : {
          back: 'Volver',
          writtenBy: 'Escrito por Kevin Montatixe',
          authorBio: 'Ingeniero en Ciberseguridad y Docente. Enfocado en la rigurosidad técnica y la defensa activa de infraestructuras.',
        };

  return (
    <main className="min-h-screen bg-white dark:bg-black transition-colors duration-500 antialiased">
      
      {/* NAVEGACIÓN SUPERIOR */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-100 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/${lang}/blog`} className="flex items-center gap-2 text-zinc-500 hover:text-apple-blue transition-colors text-sm font-medium">
            <ArrowLeft size={16} />
            <span>{ui.back}</span>
          </Link>
          <div className="flex gap-4 text-zinc-400">
            <Share2 size={18} className="cursor-pointer hover:text-zinc-900 dark:hover:text-white" />
            <Bookmark size={18} className="cursor-pointer hover:text-zinc-900 dark:hover:text-white" />
          </div>
        </div>
      </nav>

      {/* CUERPO DEL ARTÍCULO */}
      <article className="max-w-3xl mx-auto px-6 py-20 md:py-32">
        
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
          
          <p className="text-xl md:text-2xl text-zinc-500 dark:text-zinc-400 font-medium leading-tight border-l-2 border-zinc-200 dark:border-zinc-800 pl-6 py-2 italic text-balance">
            {post.data.description}
          </p>
        </header>

        <div className="prose-container">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]} // <--- Activamos el soporte para tablas
            components={{
              h2: ({ ...props }) => <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mt-16 mb-6" {...props} />,
              h3: ({ ...props }) => <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-12 mb-4" {...props} />,
              p: ({ ...props }) => <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-[1.7] mb-8 font-medium" {...props} />,
              
              // ─── DISEÑO DE TABLAS PROFESIONAL ────────────────────────────────
              table: ({ ...props }) => (
                <div className="my-10 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <table className="w-full border-collapse text-left text-sm" {...props} />
                </div>
              ),
              thead: ({ ...props }) => <thead className="bg-zinc-50 dark:bg-zinc-900/50" {...props} />,
              th: ({ ...props }) => <th className="px-6 py-4 font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800" {...props} />,
              td: ({ ...props }) => <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800" {...props} />,
              
              // ─── BLOQUES DE CÓDIGO (TERMINAL STYLE) ─────────────────────────
              // IMPORTANTE: la prop `inline` que solía distinguir código en
              // línea de bloques de código fue removida en versiones
              // recientes de react-markdown. Usarla (`!inline`) hace que
              // SIEMPRE sea `true` — así, hasta un simple `snort` mencionado
              // dentro de un párrafo terminaba envuelto en <div><pre>,
              // produciendo HTML inválido (<div>/<pre> dentro de <p>) y el
              // consiguiente error de hidratación.
              // En su lugar, usamos `node.position`: un bloque de código
              // (fenced, ```) siempre ocupa más de una línea en el markdown
              // fuente (la línea de apertura ``` y la de cierre ```, como
              // mínimo), mientras que el código en línea (`como este`)
              // siempre vive en una sola línea. Es una señal fiable e
              // independiente de la versión de la librería.
              code: ({ node, className, children, ...props }: any) => {
                const isBlock = node?.position
                  ? node.position.start.line !== node.position.end.line
                  : String(children).includes('\n');

                return isBlock ? (
                  <div className="my-10 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0d0d0d]">
                    <div className="flex items-center gap-1.5 px-4 py-3 bg-zinc-100 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                      <span className="ml-2 text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Terminal</span>
                    </div>
                    <pre className="p-6 overflow-x-auto">
                      <code className="text-sm md:text-base font-mono text-apple-blue leading-relaxed" {...props}>
                        {children}
                      </code>
                    </pre>
                  </div>
                ) : (
                  <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-apple-blue font-mono text-sm" {...props}>
                    {children}
                  </code>
                );
              },
              
              ul: ({ ...props }) => <ul className="list-none space-y-4 mb-10 pl-0" {...props} />,
              li: ({ ...props }) => (
                <li className="flex items-start gap-4 text-zinc-600 dark:text-zinc-400 text-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-apple-blue mt-2.5 shrink-0" />
                  <span {...props} />
                </li>
              ),
              strong: ({ ...props }) => <strong className="text-zinc-900 dark:text-white font-bold" {...props} />,
            }}
          >
            {post.content}
          </ReactMarkdown>
        </div>

        <footer className="mt-24 pt-12 border-t border-zinc-100 dark:border-white/10">
          <div className="flex flex-col md:flex-row items-center gap-6 p-8 bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2.5rem]">
            <div className="w-16 h-16 rounded-full bg-apple-blue flex items-center justify-center text-white font-bold text-xl">
              CJ
            </div>
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-white">{ui.writtenBy}</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{ui.authorBio}</p>
            </div>
          </div>
        </footer>
      </article>
    </main>
  );
}