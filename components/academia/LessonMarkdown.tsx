import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renderizador de Markdown de las lecciones (mismo estilo que el blog: código en
// "terminal", tablas con borde, listas con viñeta de color). Componente puro →
// sirve en server y client components.
export default function LessonMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ ...props }) => <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mt-14 mb-5" {...props} />,
          h3: ({ ...props }) => <h3 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-10 mb-4" {...props} />,
          p: ({ ...props }) => <p className="text-[17px] md:text-lg text-zinc-600 dark:text-zinc-300 leading-[1.75] mb-6" {...props} />,
          a: ({ ...props }) => <a className="text-green-600 dark:text-green-400 font-semibold underline underline-offset-2 hover:opacity-80" {...props} />,
          blockquote: ({ ...props }) => (
            <blockquote className="my-8 border-l-4 border-green-500 pl-5 py-1 text-zinc-700 dark:text-zinc-200 bg-green-500/5 rounded-r-xl" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="my-8 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full border-collapse text-left text-sm" {...props} />
            </div>
          ),
          thead: ({ ...props }) => <thead className="bg-zinc-50 dark:bg-zinc-900/50" {...props} />,
          th: ({ ...props }) => <th className="px-5 py-3 font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800" {...props} />,
          td: ({ ...props }) => <td className="px-5 py-3 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 align-top" {...props} />,
          code: ({ node, children, ...props }: any) => {
            const isBlock = node?.position
              ? node.position.start.line !== node.position.end.line
              : String(children).includes('\n');
            return isBlock ? (
              <div className="my-8 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0d0d0d]">
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <pre className="p-5 overflow-x-auto">
                  <code className="text-[13px] md:text-sm font-mono text-zinc-800 dark:text-green-300 leading-relaxed" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            ) : (
              <code className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-green-600 dark:text-green-400 font-mono text-[0.85em]" {...props}>
                {children}
              </code>
            );
          },
          ul: ({ ...props }) => <ul className="list-none space-y-3 mb-6 pl-0" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal space-y-3 mb-6 pl-5 text-zinc-600 dark:text-zinc-300 marker:text-green-500 marker:font-bold" {...props} />,
          li: ({ children, ...props }: any) => (
            <li className="text-[17px] text-zinc-600 dark:text-zinc-300 leading-relaxed" {...props}>
              {children}
            </li>
          ),
          strong: ({ ...props }) => <strong className="text-zinc-900 dark:text-white font-bold" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
