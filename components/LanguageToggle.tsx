'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';


export default function LanguageToggle() {
  const pathname = usePathname();
  const currentLang = pathname.split('/')[1];
  const [isTransitioning, setIsTransitioning] = useState(false);

  const toggleLanguage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    const nextLang = currentLang === 'es' ? 'en' : 'es';
    const newPath = pathname.replace(`/${currentLang}`, `/${nextLang}`);

    // 1. SANITIZADOR DE HASH: Destruye la acumulación de la URL
    // Si la URL es "#exp#contacto", esto extrae estrictamente "contacto"
    const rawHash = window.location.hash;
    const cleanHash = rawHash ? '#' + rawHash.split('#').filter(Boolean).pop() : '';

    // 2. CAPTURA DE COORDENADAS: Guardamos la ubicación exacta en memoria
    sessionStorage.setItem('i18n_scroll', Math.round(window.scrollY).toString());

    // 3. URL FINAL LIMPIA
    const targetUrl = `${newPath}${cleanHash}`;

    // 4. DISPARO CON VELO DE TRANSICIÓN
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 400); 
  };

  return (
    <>
      {/* EL VELO DE TRANSICIÓN: Oculta la recarga de la página */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center bg-white/10 dark:bg-black/20"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-16 h-16 rounded-full border-t-2 border-apple-blue shadow-[0_0_20px_rgba(0,122,255,0.4)]"
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
          animate={{ x: currentLang === 'es' ? 0 : 32 }}
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