'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, Moon, Sun, Menu, X, ChevronDown, ChevronRight, LayoutDashboard, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';
import LanguageToggle from '@/components/LanguageToggle';
import NavSession from '@/components/sentra/NavSession';
import ProAvatar from '@/components/sentra/ProAvatar';
import { sentraLogout } from '@/lib/sentra/api';
import { useSentraSession } from '@/lib/sentra/useSession';

interface AboutMeItems {
  about: string;
  academic: string;
  skills: string;
  projects: string;
  certifications: string;
  experience: string;
  contact: string;
}

interface SessionDict {
  login: string;
  panel: string;
  logout: string;
}

interface NavBarProps {
  dict: {
    aboutMe: string;
    aboutMeItems: AboutMeItems;
    services: string;
    sentinel: string;
    tools: string;
    toolsBadge?: string;
    blog: string;
    session?: SessionDict;
  };
  lang: string;
}

const SESSION_FALLBACK: SessionDict = {
  login: 'Iniciar sesión',
  panel: 'Panel',
  logout: 'Cerrar sesión',
};

export default function NavBar({ dict, lang }: NavBarProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // menú móvil
  const [aboutOpen, setAboutOpen] = useState(false); // dropdown desktop
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false); // acordeón móvil
  const { theme, setTheme, resolvedTheme } = useTheme();
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Una sola fuente de sesión para el NavBar entero: el avatar de desktop
  // (NavSession) la recibe por prop y el menú móvil la usa directamente.
  const { user: sessionUser } = useSentraSession();
  const sessionDict = dict.session ?? SESSION_FALLBACK;

  async function handleMobileLogout() {
    setIsOpen(false);
    await sentraLogout();
    router.push(`/${lang}/sentinel/login`);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // "Sobre mí" agrupa todo lo que hoy vive dentro del home como anclas
  const aboutMeLinks = useMemo(
    () => [
      { name: dict.aboutMeItems.about, href: `/${lang}/#sobre-mi` },
      { name: dict.aboutMeItems.academic, href: `/${lang}/#academico` },
      { name: dict.aboutMeItems.skills, href: `/${lang}/#habilidades` },
      { name: dict.aboutMeItems.projects, href: `/${lang}/#proyectos` },
      { name: dict.aboutMeItems.certifications, href: `/${lang}/#certificados` },
      { name: dict.aboutMeItems.experience, href: `/${lang}/#experiencia` },
      { name: dict.aboutMeItems.contact, href: `/${lang}/#contacto` },
    ],
    [dict, lang]
  );

  // Los 3 (+Blog) ítems principales, tal como pediste: sin milanesa de links
  const primaryLinks = useMemo<
    { name: string; href: string; accent?: boolean; badge?: string }[]
  >(
    () => [
      { name: dict.services, href: `/${lang}/services` },
      { name: dict.sentinel, href: `/${lang}/sentinel`, accent: true },
      { name: dict.tools, href: `/${lang}/herramientas/cv`, badge: dict.toolsBadge },
      { name: dict.blog, href: `/${lang}/blog` },
    ],
    [dict, lang]
  );

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // Apertura/cierre del dropdown con pequeño delay, como en apple.com,
  // para que no se cierre si el mouse pasa entre el trigger y el panel.
  const handleEnter = () => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    setAboutOpen(true);
  };
  const handleLeave = () => {
    closeTimeout.current = setTimeout(() => setAboutOpen(false), 150);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/5 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={`/${lang}`} className="flex items-center gap-2 group cursor-pointer z-50">
          <Shield className="w-5 h-5 text-apple-blue transition-transform group-hover:scale-110" />
          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">CescJavier</span>
        </Link>

        {/* ===== DESKTOP ===== */}
        <div className="hidden md:flex gap-8 items-center">
          {/* Dropdown "Sobre mí" */}
          <div
            className="relative"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <button
              className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:text-apple-blue dark:hover:text-apple-blue transition-colors uppercase tracking-wider"
              aria-expanded={aboutOpen}
            >
              {dict.aboutMe}
              <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${aboutOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {aboutOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-64 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden py-2"
                >
                  {aboutMeLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setAboutOpen(false)}
                      className="block px-5 py-2.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-apple-blue dark:hover:text-apple-blue transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {primaryLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors uppercase tracking-wider ${
                link.accent
                  ? 'text-apple-blue hover:text-zinc-900 dark:hover:text-white'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-apple-blue dark:hover:text-apple-blue'
              }`}
            >
              {link.name}
              {link.badge && (
                <span className="rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 px-1.5 py-0.5 text-[9px] font-bold leading-none tracking-normal normal-case">
                  {link.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 z-50">
          {/* En mobile la sesión vive dentro del menú hamburguesa (la barra
              quedaba muy cargada con avatar + idioma + tema + menú). */}
          <div className="hidden sm:block">
            <NavSession lang={lang} dict={sessionDict} user={sessionUser} />
          </div>
          <LanguageToggle />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center w-8 h-8"
            aria-label="Alternar Modo Oscuro"
          >
            {mounted ? (
              resolvedTheme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-zinc-600" />
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>
          <button
            className="md:hidden p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-900 dark:text-white"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Alternar Menú Móvil"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ===== MOBILE ===== */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-14 left-0 w-full max-h-[calc(100vh-56px)] overflow-y-auto bg-white/95 dark:bg-black/95 backdrop-blur-3xl border-b border-zinc-200 dark:border-white/10 flex flex-col items-center py-8 gap-6 shadow-2xl"
          >
            {/* Acordeón "Sobre mí" */}
            <button
              onClick={() => setMobileAboutOpen(!mobileAboutOpen)}
              className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-zinc-900 dark:text-white"
            >
              {dict.aboutMe}
              <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${mobileAboutOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {mobileAboutOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col items-center gap-5 overflow-hidden"
                >
                  {aboutMeLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-base font-semibold text-zinc-600 dark:text-zinc-400 hover:text-apple-blue transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-16 h-px bg-zinc-200 dark:bg-zinc-800" />

            {primaryLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`inline-flex items-center gap-2 text-xl font-bold tracking-tight transition-colors ${
                  link.accent ? 'text-apple-blue' : 'text-zinc-900 dark:text-white hover:text-apple-blue'
                }`}
              >
                {link.name}
                {link.badge && (
                  <span className="rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 px-2 py-0.5 text-[10px] font-bold leading-none">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}

            {/* Sesión en mobile: tarjeta estilo iOS (celdas con hairlines),
                al pie del menú — como el bloque de cuenta en Ajustes. */}
            <div className="w-full px-6 pt-2">
              {sessionUser ? (
                <div className="rounded-2xl bg-zinc-100/80 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/10 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <ProAvatar email={sessionUser.email} plan={sessionUser.plan} size={40} />
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-zinc-900 dark:text-white truncate">
                        {sessionUser.email}
                      </p>
                      <p className="text-[11px] uppercase tracking-wider text-green-600 dark:text-green-400 font-semibold">
                        {sessionUser.role}
                      </p>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-200/80 dark:bg-white/10" />
                  <Link
                    href={`/${lang}/sentinel/panel`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-[15px] font-medium text-zinc-900 dark:text-white active:bg-zinc-200/60 dark:active:bg-white/10 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <LayoutDashboard className="w-4 h-4 text-zinc-400" /> {sessionDict.panel}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </Link>
                  <div className="h-px bg-zinc-200/80 dark:bg-white/10" />
                  <button
                    onClick={handleMobileLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-[15px] font-medium text-red-500 active:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> {sessionDict.logout}
                  </button>
                </div>
              ) : (
                <Link
                  href={`/${lang}/sentinel/login`}
                  onClick={() => setIsOpen(false)}
                  className="block w-full text-center px-6 py-3.5 rounded-2xl bg-apple-blue text-white text-[15px] font-semibold active:opacity-80 transition-opacity"
                >
                  {sessionDict.login}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}