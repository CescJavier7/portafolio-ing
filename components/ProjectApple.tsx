'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiGithub } from 'react-icons/si';
import { ExternalLink, TerminalSquare, ChevronLeft, ChevronRight, Info, X, MousePointerClick } from 'lucide-react';

// ─── DATOS DE PROYECTOS (Añade tus imágenes en la carpeta 'public') ──────────
const projects = [
  {
    title: "SecureVault",
    category: "Ciberseguridad / Fullstack",
    description: "Una aplicación web ultra-segura para gestión de contraseñas corporativas. Implementa cifrado AES-256 de extremo a extremo, autenticación multifactor (MFA) y está protegida contra ataques OWASP Top 10.",
    techs: ["Next.js", "TypeScript", "PostgreSQL", "Bcrypt", "Tailwind"],
    image: "/proyecto.png", // <--- Imagen de tu proyecto
    github: "#",
    demo: "#"
  },
  {
    title: "E-Commerce Monolith",
    category: "Desarrollo Web",
    description: "Plataforma de comercio electrónico de alto rendimiento capaz de procesar pagos con Stripe. Incluye un panel de administración (Dashboard) con analíticas en tiempo real.",
    techs: ["React", "Node.js", "Stripe API", "MongoDB", "Framer Motion"],
    image: "/proyecto2.png", // <--- Imagen de tu proyecto
    github: "#",
    demo: "#"
  },
  {
    title: "E-sss Monolith",
    category: "Desarrollo Web",
    description: "Plataforma de comercio electrónico de alto rendimiento capaz de procesar pagos con Stripe. Incluye un panel de administración (Dashboard) con analíticas en tiempo real.",
    techs: ["React", "Node.js", "Stripe API", "MongoDB", "Framer Motion"],
    image: "/proyecto2.png", // <--- Imagen de tu proyecto
    github: "#",
    demo: "#"
  }
];

// Tipo para TypeScript
type Project = typeof projects[0];

export default function ProjectsApple() {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const scrollDirection = useRef<'forward' | 'backward'>('forward');
  
  // Estado para la ventana Modal
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // ─── BLOQUEAR SCROLL AL ABRIR EL MODAL ─────────────────────────────────────
  useEffect(() => {
    if (activeProject) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeProject]);

  // ─── LÓGICA DE AUTO-PLAY (PING-PONG) ───────────────────────────────────────
  useEffect(() => {
    if (isHovered || activeProject) return; // Se pausa si el modal está abierto

    const interval = setInterval(() => {
      if (!carouselRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      const maxScroll = scrollWidth - clientWidth;
      const scrollAmount = clientWidth > 768 ? 624 : clientWidth * 0.85;

      if (scrollDirection.current === 'forward') {
        if (scrollLeft >= maxScroll - 10) {
          scrollDirection.current = 'backward';
          carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      } else {
        if (scrollLeft <= 10) {
          scrollDirection.current = 'forward';
          carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        } else {
          carouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isHovered, activeProject]);

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const { clientWidth } = carouselRef.current;
    const scrollAmount = clientWidth > 768 ? 624 : clientWidth * 0.85;
    
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
    scrollDirection.current = direction === 'left' ? 'backward' : 'forward';
  };

  return (
    <section id="proyectos" className="py-24 w-full bg-white dark:bg-black transition-colors duration-500 relative">
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* CABECERA */}
      <div className="max-w-7xl mx-auto px-6 mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.header 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-apple-blue font-semibold mb-3 text-sm uppercase tracking-widest">Portafolio</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Mira lo más destacado.
          </h2>
        </motion.header>

        {/* Controles PC */}
        <div className="hidden md:flex gap-4 pb-2">
          <button onClick={() => scroll('left')} className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <button onClick={() => scroll('right')} className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500">
            <ChevronRight size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* CONTENEDOR CARRUSEL */}
      <div className="relative w-full">
        
        {/* Flechas Móviles Flotantes */}
        <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between z-30 pointer-events-none md:hidden">
          <button onClick={() => scroll('left')} className="pointer-events-auto w-10 h-10 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-lg flex items-center justify-center text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10 active:scale-95 transition-transform">
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button onClick={() => scroll('right')} className="pointer-events-auto w-10 h-10 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-lg flex items-center justify-center text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10 active:scale-95 transition-transform">
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div 
          ref={carouselRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
          className="flex overflow-x-auto snap-x snap-mandatory gap-6 px-6 md:px-[10vw] pb-12 w-full no-scrollbar relative z-20"
        >
          {projects.map((project, index) => (
            <motion.div 
              key={project.title}
              initial={{ opacity: 0, x: 50 }} 
              whileInView={{ opacity: 1, x: 0 }} 
              viewport={{ once: true, margin: "-50px" }} 
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="group relative shrink-0 snap-center w-[85vw] md:w-[600px] h-[450px] md:h-[550px] rounded-[2rem] md:rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm transition-all duration-500"
            >
              
              {/* 1. MOCKUP VENTANA SAFARI INMERSIVA (NUEVO DISEÑO FULL-WIDTH) */}
              <div className="absolute inset-0 pt-8 flex items-end">
                {/* traffic light de la ventana */}
                <div className="absolute top-0 inset-x-0 h-8 bg-zinc-100 dark:bg-black/80 border-b border-zinc-200 dark:border-white/10 flex items-center px-4 gap-1.5 z-20">
                   <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                </div>

                {/* Imagen del Proyecto ocupando TODO el espacio */}
                <div className="relative w-full h-full overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-[2s] md:group-hover:scale-105" 
                  />
                  {/* Gradiente inmersivo para la legibilidad */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/40 to-black/20" />
                </div>
              </div>

              {/* 2. TEXTO INFERIOR (Siempre visible sobre la imagen) */}
              <div className="absolute inset-x-0 bottom-0 p-8 md:p-10 transition-opacity duration-500 md:group-hover:opacity-0 z-30">
                 <div className="flex items-center gap-2 text-apple-blue mb-2">
                   <TerminalSquare size={16} />
                   <p className="font-mono text-xs uppercase tracking-widest">{project.category}</p>
                 </div>
                 <h3 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">{project.title}</h3>
                 
                 {/* BOTÓN PARA MÓVIL (Info) */}
                 <button 
                   onClick={() => setActiveProject(project)}
                   className="mt-6 flex md:hidden items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white font-medium active:scale-95 transition-transform"
                 >
                   <MousePointerClick size={18} /> Toca para ver detalles
                 </button>
              </div>

              {/* 3. PANEL DE CRISTAL INTERNO (PC ONLY, INMERSIVO) */}
              <div className="hidden md:flex absolute inset-x-0 bottom-0 top-8 bg-black/90 backdrop-blur-xl p-12 flex-col justify-center opacity-0 translate-y-8 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out z-40">
                 <p className="text-apple-blue font-mono text-xs uppercase tracking-widest mb-4">{project.category}</p>
                 <h3 className="text-4xl font-bold text-white mb-6">{project.title}</h3>
                 <p className="text-zinc-300 text-lg leading-relaxed mb-8 text-balance">
                   {project.description}
                 </p>
                 <div className="flex flex-wrap gap-2 mb-10">
                   {project.techs.map(tech => (
                     <span key={tech} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 text-zinc-200 border border-white/10">
                       {tech}
                     </span>
                   ))}
                 </div>
                 <div className="flex items-center gap-4 mt-auto">
                   <a href={project.github} className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform text-sm">
                     <SiGithub className="w-4 h-4" /> Código
                   </a>
                   <a href={project.demo} className="flex items-center gap-2 px-6 py-3.5 rounded-full text-white border border-white/20 hover:bg-white/10 transition-colors text-sm font-semibold">
                     <ExternalLink className="w-4 h-4" /> Live Demo
                   </a>
                 </div>
              </div>

            </motion.div>
          ))}
        </div>
      </div>

      {/* 4. MODAL ESTILO APPLE (BOTTOM SHEET PARA MÓVILES) */}
      <AnimatePresence>
        {activeProject && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
            
            {/* Fondo borroso (Backdrop) */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveProject(null)}
              className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            {/* Contenedor del Modal */}
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col z-[101]"
            >
              {/* Píldora de arrastre (Móvil) */}
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-4 shrink-0 md:hidden" />

              {/* Botón de cerrar */}
              <button 
                onClick={() => setActiveProject(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors z-10"
              >
                <X size={18} />
              </button>

              {/* Contenido scrolleable */}
              <div className="overflow-y-auto p-6 md:p-10 pb-12 no-scrollbar">
                <p className="text-apple-blue font-mono text-xs uppercase tracking-widest mb-2">{activeProject.category}</p>
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">{activeProject.title}</h3>

                {/* Imagen dentro del modal */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-black">
                  <img src={activeProject.image} alt={activeProject.title} className="w-full h-full object-cover" />
                </div>

                <p className="text-zinc-600 dark:text-zinc-300 text-base md:text-lg leading-relaxed mb-8">
                  {activeProject.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-10">
                  {activeProject.techs.map(tech => (
                    <span key={tech} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {tech}
                    </span>
                  ))}
                </div>

                {/* Botones */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <a href={activeProject.github} className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold active:scale-95 transition-transform text-sm">
                     <SiGithub className="w-4 h-4" /> Ver Código
                  </a>
                  <a href={activeProject.demo} className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors text-sm font-semibold">
                    <ExternalLink className="w-4 h-4" /> Live Demo
                  </a>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}