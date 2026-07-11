'use client';

import { useState, useEffect, useMemo } from 'react';
import { Shield, Moon, Sun, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import LanguageToggle from '@/components/LanguageToggle';

// 1. INTERFAZ ESTRICTA
interface NavBarProps {
  dict: {
    about: string;
    skills: string;
    projects: string;
    certifications: string;
    experience: string;
    contact: string;
    blog: string;
  };
  lang: string;
}

export default function NavBar({ dict, lang }: NavBarProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // 2. EXTRAEMOS LA LÓGICA DE TEMA (Librería nativa)
  const { theme, setTheme, resolvedTheme } = useTheme();

  // 3. SEGURO CONTRA HYDRATION MISMATCH
  useEffect(() => {
    setMounted(true);
  }, []);

  // 4. MEMORIZACIÓN DE ENLACES: Evita re-cálculos si cambia el estado isOpen
  const navLinks = useMemo(() => [
    { name: dict.about, href: `/${lang}/#sobre-mi` },
    { name: dict.skills, href: `/${lang}/#habilidades` },
    { name: dict.projects, href: `/${lang}/#proyectos` },
    { name: dict.certifications, href: `/${lang}/#certificados` },
    { name: dict.experience, href: `/${lang}/#experiencia` },
    { name: dict.contact, href: `/${lang}/#contacto` },
    { name: dict.blog, href: `/${lang}/blog` },
  ], [dict, lang]);

  // 5. ACCIÓN DE CAMBIO DE TEMA
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href={`/${lang}`} className="flex items-center gap-2 group cursor-pointer z-50">
          <Shield className="w-5 h-5 text-apple-blue transition-transform group-hover:scale-110" />
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">CescJavier</span>
        </Link>

        {/* ENLACES ESCRITORIO */}
        <div className="hidden md:flex gap-8 items-center">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href} 
              className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-apple-blue dark:hover:text-apple-blue transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* CONTROLES */}
        <div className="flex items-center gap-4 z-50">
          <LanguageToggle />

          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center w-8 h-8"
            aria-label="Alternar Modo Oscuro"
          >
            {/* TWO-PASS RENDERING: Placeholder vacío hasta que se monta en el cliente */}
            {mounted ? (
              resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-600" />
            ) : (
              <div className="w-4 h-4" /> 
            )}
          </button>

          {/* HAMBURGUESA MÓVIL */}
          <button 
            className="md:hidden p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Alternar Menú Móvil"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MENÚ MÓVIL */}
      {isOpen && (
        <div className="md:hidden absolute top-14 left-0 w-full bg-white/95 dark:bg-black/95 backdrop-blur-3xl border-b border-zinc-200 dark:border-white/10 flex flex-col items-center py-8 gap-8 shadow-2xl transition-all">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href} 
              onClick={() => setIsOpen(false)}
              className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white hover:text-apple-blue transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}