import { SiGithub, SiLinkerd, SiX } from 'react-icons/si';
import { Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 dark:border-white/5 bg-apple-gray dark:bg-[#080808] py-12">
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Lado Izquierdo: Copyright */}
        <div className="text-center md:text-left">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            © {new Date().getFullYear()} CescJavier7.
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Ingeniería & Ciberseguridad. Construido con Next.js 15.
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
    </footer>
  );
}