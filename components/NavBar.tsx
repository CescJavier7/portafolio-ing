'use client';
import { useState, useEffect } from 'react';
import { Shield, Moon, Sun, Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function NavBar() {
  const [isDark, setIsDark] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // ENLACES CORREGIDOS: Ahora apuntan exactamente a los IDs de tus secciones
  const navLinks = [
    { name: 'Sobre mí', href: '/#sobre-mi' },
    { name: 'Habilidades', href: '/#habilidades' },
    { name: 'Proyectos', href: '/#proyectos' },
    { name: 'Experiencia', href: '/#experiencia' }, // Corregido aquí
    { name: 'Contacto', href: '/#contacto' }, // ¡Nuevo enlace agregado!
    { name: 'Blog & Educación', href: '/blog' }, // ¡Nuevo enlace agregado!
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group cursor-pointer z-50">
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

        {/* ACCIONES (Modo oscuro y Menú Móvil) */}
        <div className="flex items-center gap-2 z-50">
          <button 
            onClick={() => setIsDark(!isDark)} 
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
          </button>

          <button 
            className="md:hidden p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* MENÚ MÓVIL DESPLEGABLE */}
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