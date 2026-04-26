'use client';
import { motion } from 'framer-motion';

// ─── ICONOS SVG PUROS (Cero dependencias, nunca fallan) ──────────────────────

const IconMail = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconLinkedIn = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const IconGitHub = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const IconCV = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" x2="8" y1="13" y2="13"/>
    <line x1="16" x2="8" y1="17" y2="17"/>
    <line x1="10" x2="8" y1="9" y2="9"/>
  </svg>
);

const IconArrowRight = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 7h10v10"/>
    <path d="M7 17 17 7"/>
  </svg>
);

// ─── DATOS ───────────────────────────────────────────────────────────────────

const contactMethods = [
  {
    title: 'Correo Electrónico',
    description: 'javiercaiza220158@gmail.com',
    icon: IconMail,
    href: 'mailto:javiercaiza220158@gmail.com',
    isPrimary: true, 
  },
  {
    title: 'LinkedIn',
    description: 'Conectemos profesionalmente',
    icon: IconLinkedIn,
    href: 'https://www.linkedin.com/in/kevin-javier-montatixe-2a08b6295/',
    isPrimary: false,
  },
  {
    title: 'GitHub',
    description: 'Explora mis repositorios y código',
    icon: IconGitHub, 
    href: 'https://github.com/CescJavier7',
    isPrimary: false,
  },
  {
    title: 'Currículum Vitae',
    description: 'Descarga mi perfil técnico detallado',
    icon: IconCV,
    // 1. La ruta apunta directamente al nombre del archivo en la carpeta public
    href: '/Javier CV - Harvard Style.pdf', 
    isPrimary: false,
    // 2. Agregamos una propiedad nueva para identificar que es descarga
    download: 'Javier CV - Harvard Style.pdf' 
  },
];

{contactMethods.map((method, index) => (
  <motion.a
    key={method.title}
    href={method.href}
    // Si existe la propiedad download, se la asignamos al enlace
    download={method.download} 
    target={method.download ? undefined : "_blank"} // No abrimos pestaña nueva si es descarga
    rel="noopener noreferrer"
    // ... el resto de tus animaciones y clases
  >
    {/* ... contenido de la tarjeta ... */}
  </motion.a>
))}

export default function ContactApple() {
  return (
    <section id="contacto" className="py-24 bg-white dark:bg-black transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        
        {/* Cabecera */}
        <div className="mb-16 md:text-center">
          <p className="text-apple-blue font-bold tracking-tight mb-3 uppercase text-xs italic">
            Próximos Pasos
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-4">
            Iniciemos una conversación.
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto text-balance">
            ¿Tienes un proyecto en mente, buscas fortalecer la seguridad de tu infraestructura, o simplemente quieres hablar de tecnología? Mis bandejas están abiertas.
          </p>
        </div>

        {/* Grid de Contactos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contactMethods.map((method, index) => (
            <motion.a
              key={method.title}
              href={method.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col justify-between p-8 rounded-[2rem] overflow-hidden group transition-colors duration-300 ${
                method.isPrimary 
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black' 
                  : 'bg-[#f5f5f7] dark:bg-[#1d1d1f] text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="absolute top-8 right-8">
                <IconArrowRight className={`w-5 h-5 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 ${
                  method.isPrimary ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400'
                }`} />
              </div>

              <div>
                <method.icon className={`w-8 h-8 mb-6 ${
                  method.isPrimary ? 'text-white dark:text-black' : 'text-apple-blue'
                }`} />
                <h3 className="text-2xl font-bold tracking-tight mb-2">
                  {method.title}
                </h3>
                <p className={`font-medium ${
                  method.isPrimary ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-500 dark:text-zinc-400'
                }`}>
                  {method.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>

      </div>
    </section>
  );
}