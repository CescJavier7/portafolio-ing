'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';


export default function LanguageToggle() {
  const pathname = usePathname();
  const currentLang = pathname.split('/')[1];

  

  const toggleLanguage = () => {
    
    const nextLang = currentLang === 'es' ? 'en' : 'es';
    const newPath = pathname.replace(`/${currentLang}`, `/${nextLang}`);
    
    // NAVEGACIÓN FUERTE (Hard Reload):
    // Forzamos al navegador a solicitar la página directamente al Servidor.
    // Esto previene la reconstrucción del Layout en el cliente y elimina 
    // el error de inyección de <script> de next-themes en React 19.
    window.location.href = newPath;
  };

  
  return (
    <button
      onClick={toggleLanguage}
      className="relative flex items-center w-[72px] h-8 p-1 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300/50 dark:border-zinc-700/50 backdrop-blur-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-apple-blue/50 transition-all hover:scale-105 active:scale-95"
      aria-label="Toggle Language"
    >
      {/* Fondo deslizable */}
      <motion.div
        className="absolute top-1 bottom-1 w-[30px] bg-white dark:bg-zinc-600 rounded-full shadow-sm"
        initial={false}
        animate={{
          x: currentLang === 'es' ? 0 : 32,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      {/* Etiquetas de texto superpuestas */}
      <div className="relative z-10 flex w-full justify-between px-1.5">
        <span className={`text-[11px] font-bold tracking-wider transition-colors duration-300 w-1/2 text-center ${currentLang === 'es' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
          ES
        </span>
        <span className={`text-[11px] font-bold tracking-wider transition-colors duration-300 w-1/2 text-center ${currentLang === 'en' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
          EN
        </span>
      </div>
    </button>
  );
}