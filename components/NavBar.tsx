'use client';

import { useState, useEffect } from 'react';
import { Shield, Moon, Sun, Menu, X } from 'lucide-react';
import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';

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
  // Antes: useState(true) — siempre arrancaba en modo oscuro. Como [lang]
  // puede remontar este componente al cambiar de idioma, ese `true` fijo
  // pisaba la preferencia real del usuario cada vez. Ahora arrancamos
  // leyendo la clase que el script anti-flash de layout.tsx ya dejó puesta
  // en <html> (que a su vez viene de localStorage) — así el valor inicial
  // ya es el correcto, sin esperar a un efecto posterior al mount.
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    return document.documentElement.classList.contains('dark');
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Persistimos la preferencia para que sobreviva a remounts (cambio de
    // idioma) y a futuras visitas.
    try {
      window.localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // Si localStorage no está disponible (modo privado, etc.), no rompemos la UI.
    }
  }, [isDark]);

  // Construcción dinámica de rutas localizadas
  const navLinks = [
    { name: dict.about, href: `/${lang}/#sobre-mi` },
    { name: dict.skills, href: `/${lang}/#habilidades` },
    { name: dict.projects, href: `/${lang}/#proyectos` },
    { name: dict.certifications, href: `/${lang}/#certificados` },
    { name: dict.experience, href: `/${lang}/#experiencia` },
    { name: dict.contact, href: `/${lang}/#contacto` },
    { name: dict.blog, href: `/${lang}/blog` },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href={`/${lang}`} className="flex items-center gap-2 group cursor-pointer z-50">
          <Shield className="w-5 h-5 text-apple-blue transition-transform group-hover:scale-110" />
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">CescJavier</span>
        </Link>

        {/* ENLACES PC */}
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

        {/* ACCIONES */}
        <div className="flex items-center gap-4 z-50">
          <LanguageToggle />

          <button 
            onClick={() => setIsDark(!isDark)} 
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle Dark Mode"
            suppressHydrationWarning
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>

          <button 
            className="md:hidden p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Mobile Menu"
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