'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function LanguageToggle() {
  const pathname = usePathname();
  const currentLang = pathname.split('/')[1];
  
  // 1. Estado para controlar el telón de transición
  const [isTransitioning, setIsTransitioning] = useState(false);

  const toggleLanguage = () => {
    // Evita clics múltiples durante la animación
    if (isTransitioning) return; 
    
    setIsTransitioning(true);

    // 2. Calculamos la nueva base de la ruta
    const nextLang = currentLang === 'es' ? 'en' : 'es';
    const newPath = pathname.replace(`/${currentLang}`, `/${nextLang}`);
    
    // 3. Capturamos los anclas (#) y parámetros (?) actuales del cliente
    const currentHash = window.location.hash;
    const currentSearch = window.location.search;
    
    // 4. Reconstruimos la URL exacta
    const fullTargetUrl = `${newPath}${currentSearch}${currentHash}`;

    // 5. Retrasamos la recarga dura para permitir que termine la animación visual
    setTimeout(() => {
      window.location.href = fullTargetUrl;
    }, 400); // 400ms: tiempo suficiente para el fundido a negro/blanco
  };

  return (
    <>
      {/* EL TELÓN DE TRANSICIÓN: Oculta la recarga de la página */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-[99999] bg-white dark:bg-black pointer-events-none flex items-center justify-center"
          >
            {/* Opcional: Un pequeño indicador de carga premium */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-800 border-t-apple-blue rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleLanguage}
        disabled={isTransitioning}
        className={`relative flex items-center w-[72px] h-8 p-1 rounded-full bg-zinc-200/60 dark:bg-zinc-800/60 border border-zinc-300/50 dark:border-zinc-700/50 backdrop-blur-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-apple-blue/50 transition-all hover:scale-105 ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
        aria-label="Toggle Language"
      >
        <motion.div
          className="absolute top-1 bottom-1 w-[30px] bg-white dark:bg-zinc-600 rounded-full shadow-sm"
          initial={false}
          animate={{
            x: currentLang === 'es' ? 0 : 32, 
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />

        <div className="relative z-10 flex w-full justify-between px-1.5">
          <span className={`text-[11px] font-bold tracking-wider transition-colors duration-300 w-1/2 text-center ${currentLang === 'es' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
            ES
          </span>
          <span className={`text-[11px] font-bold tracking-wider transition-colors duration-300 w-1/2 text-center ${currentLang === 'en' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>
            EN
          </span>
        </div>
      </button>
    </>
  );
}