import Link from 'next/link';
import { SiGithub, SiLinkerd, SiX } from 'react-icons/si';
import { Mail } from 'lucide-react';

// ─── TIPADO DEL DICCIONARIO ───────────────────────────────────────────────────
interface FooterDictionary {
  tagline: string;
  pricing?: string;
  security?: string;
  terms?: string;
  privacy?: string;
}

interface FooterProps {
  dict?: FooterDictionary;
  lang?: string;
}

export default function Footer({ dict, lang = 'es' }: FooterProps) {
  // Programación defensiva: sin diccionario válido, mostramos un fallback
  // seguro (el copyright sigue funcionando aunque falte la traducción).
  if (!dict?.tagline) {
    console.error("Critical: 'dict.tagline' is missing in Footer");
  }

  const links = [
    { href: `/${lang}/sentinel/precios`, label: dict?.pricing ?? 'Precios' },
    { href: `/${lang}/sentinel/seguridad`, label: dict?.security ?? 'Seguridad' },
    { href: `/${lang}/legal/terminos`, label: dict?.terms ?? 'Términos' },
    { href: `/${lang}/legal/privacidad`, label: dict?.privacy ?? 'Privacidad' },
  ];

  return (
    <footer className="border-t border-gray-100 dark:border-white/5 bg-apple-gray dark:bg-[#080808] py-12">
      <div className="max-w-5xl mx-auto px-4 flex flex-col gap-8">
        {/* Fila de enlaces legales / producto */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-apple-blue dark:hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6">

        {/* Lado Izquierdo: Copyright */}
        <div className="text-center md:text-left">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            © {new Date().getFullYear()} CescJavier7.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {dict?.tagline ?? 'Ingeniería & Ciberseguridad. Realizado por CescJvaier7 =).'}
          </p>
        </div>

        {/* Lado Derecho: Redes y Contacto */}
        <div className="flex gap-6 items-center">
          <a href="mailto:javiercaiza220158@gmail.com" className="text-gray-400 hover:text-apple-blue transition-colors">
            <Mail className="w-5 h-5" />
          </a>
          <a href="https://github.com/CescJavier7" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
            <SiGithub className="w-5 h-5" />
          </a>
          <a href="https://x.com/cescjavier7" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-white transition-colors">
            <SiX className="w-5 h-5" />
          </a>
        </div>

        </div>
      </div>
    </footer>
  );
}