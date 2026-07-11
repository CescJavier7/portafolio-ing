'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function LanguageToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const currentLang = pathname.split('/')[1];
  const isEs = currentLang === 'es';

  const toggleLanguage = () => {
    const nextLang = isEs ? 'en' : 'es';
    const newPath = pathname.replace(`/${currentLang}`, `/${nextLang}`);

    // `scroll: false` es la clave: por defecto Next.js hace scroll-to-top en
    // cada navegación de App Router, y como cambiar de idioma implica cambiar
    // de segmento de ruta ([lang]), lo trataba como "página nueva" y mandaba
    // al usuario al principio. Con esto se queda exactamente donde estaba.
    router.push(newPath, { scroll: false });
  };

  return (
    <button
      onClick={toggleLanguage}
      className="group relative flex items-center w-[78px] h-9 rounded-lg p-[3px] overflow-hidden
                 bg-zinc-100 dark:bg-zinc-950
                 border border-zinc-300/70 dark:border-cyan-500/25
                 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]
                 transition-colors duration-300
                 hover:border-apple-blue/60 dark:hover:border-cyan-400/60
                 focus:outline-none focus:ring-2 focus:ring-cyan-500/40
                 active:scale-95"
      aria-label="Toggle Language"
    >
      {/* Fondo tipo "circuito impreso": grid milimetrado sutil */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.12] pointer-events-none text-zinc-900 dark:text-cyan-300"
        style={{
          backgroundImage:
            'linear-gradient(90deg, currentColor 1px, transparent 1px), linear-gradient(0deg, currentColor 1px, transparent 1px)',
          backgroundSize: '5px 5px',
        }}
      />

      {/* Traza de circuito decorativa que "conecta" ambos extremos */}
      <svg
        aria-hidden
        viewBox="0 0 78 36"
        className="absolute inset-0 w-full h-full opacity-[0.18] dark:opacity-[0.35] pointer-events-none text-apple-blue dark:text-cyan-400"
      >
        <path
          d="M4 18 H20 L26 10 H52 L58 26 H74"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="18" r="1.4" fill="currentColor" />
        <circle cx="58" cy="26" r="1.4" fill="currentColor" />
      </svg>

      {/* Pastilla deslizante con glow, estilo núcleo activo */}
      <motion.div
        className="absolute top-[3px] bottom-[3px] w-[35px] rounded-md z-10
                   bg-gradient-to-br from-cyan-400 via-sky-500 to-apple-blue
                   shadow-[0_0_10px_rgba(34,211,238,0.55),0_0_2px_rgba(34,211,238,0.8)]"
        initial={false}
        animate={{ x: isEs ? 0 : 37 }}
        transition={{ type: 'spring', stiffness: 480, damping: 30 }}
      />

      {/* Etiquetas monoespaciadas, estética terminal */}
      <div className="relative z-20 flex w-full h-full font-mono">
        <span
          className={`flex-1 flex items-center justify-center text-[11px] font-bold tracking-widest transition-colors duration-300 ${
            isEs ? 'text-white' : 'text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
          }`}
        >
          ES
        </span>
        <span
          className={`flex-1 flex items-center justify-center text-[11px] font-bold tracking-widest transition-colors duration-300 ${
            !isEs ? 'text-white' : 'text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
          }`}
        >
          EN
        </span>
      </div>

      {/* Brackets de esquina, tipo mira/terminal — solo visibles al enfocar/hover */}
      <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/0 group-hover:border-cyan-400/80 group-focus-visible:border-cyan-400/80 transition-colors duration-300 rounded-tl-lg" />
      <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/0 group-hover:border-cyan-400/80 group-focus-visible:border-cyan-400/80 transition-colors duration-300 rounded-br-lg" />
    </button>
  );
}