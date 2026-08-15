'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SiGithub } from 'react-icons/si';
import { ExternalLink, TerminalSquare, ChevronLeft, ChevronRight, X, MousePointerClick } from 'lucide-react';

// ─── METADATA DE PROYECTOS (NO TRADUCIBLE) ───────────────────────────────────
// Assets, links y stack tecnológico no cambian entre idiomas. El orden es
// fijo y debe coincidir 1:1 con `dict.items`.
const projectMeta: {
  techs: string[];
  image: string;
  github: string;
  demo: string;
  comingSoon?: boolean;
}[] = [
  {
    // Sentra — SaaS insignia de seguridad web.
    techs: ["FastAPI", "Next.js 16", "PostgreSQL", "Redis", "Docker", "Traefik", "Lemon Squeezy", "Groq LLM"],
    image: "/sentra-preview.png",
    github: "",
    demo: "https://cescjavier.dev/es/sentinel"
  },
  {
    // AI ATS-Resume Builder — el generador de CV actual.
    techs: ["FastAPI", "Groq LLM", "Tesseract OCR", "pypdf", "Next.js", "driver.js"],
    image: "/cv-builder-preview.png",
    github: "",
    demo: "https://cescjavier.dev/es/herramientas/cv"
  },
  {
    // DartShannon (Ficha Viva) — próximamente.
    techs: [],
    image: "/dartshannon-preview.png",
    github: "",
    demo: "",
    comingSoon: true
  },
  {
    techs: ["FastAPI", "ReactFlow (WebSockets)", "Elasticsearch", "Docker", "Suricata (NIDS)", "Zero-Trust SSH", "Redis"],
    image: "/sentinelx-preview.jpeg",
    github: "https://github.com/CescJavier7/SentinelX-SOAR",
    demo: ""
  },
  {
    techs: ["Next.js (App Router)", "TypeScript", "Supabase (SSR - Auth/DB)", "Zustand", "Tailwind CSS", "Framer Motion"],
    image: "/nexus-topup-preview.png",
    github: "https://github.com/CescJavier7/Recargas-Robux",
    demo: "https://recargas-robux-bso7.vercel.app/"
  },
  {
    techs: ["MQL4", "Algorithmic Trading", "Modelado Matemático", "Gestión de Riesgo"],
    image: "/trading-bot.jpg",
    github: "https://github.com/CescJavier7/bot_trading",
    demo: ""
  },
  {
    techs: ["Snort (IDS)", "Fail2ban (IPS)", "Grafana, Loki & Promtail", "Kali Linux (Pentesting)", "Ubuntu Server", "Análisis de Firmas", "Iptables"],
    image: "/dashboardnids.jpg",
    github: "https://github.com/CescJavier7/NIDS-IPS-Observability",
    demo: ""
  },
  {
    techs: ["Burp Suite", "Kali Linux", "OWASP Top 10", "Docker", "SQL Injection", "XSS"],
    image: "/owasp_juice_shop.png",
    github: "https://github.com/CescJavier7/Web-Pentesting-Portfolio",
    demo: ""
  },
  {
    techs: ["Lógica de Validación", "HTML5", "CSS3", "JavaScript", "Diseño UX"],
    image: "/agromix.jpg",
    github: "https://github.com/CescJavier7/manejo_integrado",
    demo: "https://cescjavier7.github.io/manejo_integrado/"
  },
  {
    techs: [
    "Nuxt 4", "Vue 3", "TypeScript", "Medusa v2",
    "PostgreSQL", "Redis", "Docker", "Traefik", "Google Sheets API"
    ],
    image: "/catalogo-mama.jpg",
    github: "https://github.com/CescJavier7/AngieCatalogos",
    demo: "https://tienda.cescjavier.dev"},
  {
    techs: ["HTML5", "CSS3", "JavaScript", "Animaciones de Rendimiento"],
    image: "/drobys-band.jpg",
    github: "https://github.com/CescJavier7/drobysband",
    demo: "https://cescjavier7.github.io/drobysband/"
  }
];

// ─── TIPADO DEL DICCIONARIO ───────────────────────────────────────────────────
interface ProjectItemDictionary {
  title: string;
  category: string;
  description: string;
}

interface ProjectsDictionary {
  tag: string;
  title: string;
  mobileCta: string;
  codeLabel: string;
  viewCodeLabel: string;
  demoLabel: string;
  comingSoon?: string;
  items: ProjectItemDictionary[];
}

interface ProjectsAppleProps {
  dict?: ProjectsDictionary;
}

type Project = ProjectItemDictionary & (typeof projectMeta)[number];

// ─── EASING (CURVA PROPIA, MÁS "APPLE" QUE EL scroll-behavior NATIVO) ────────
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Scroll animado a mano con requestAnimationFrame: nos da control total sobre
// la duración y la curva, evitando la inconsistencia del "smooth" nativo entre
// navegadores (Chrome/Safari/Firefox lo interpretan con timings distintos).
// Recibe un `cancelRef` para poder abortar una animación en curso si el
// usuario dispara otra transición antes de que termine (evita el "tirón"
// que se veía al hacer clic rápido en las flechas). También desactiva el
// scroll-snap nativo del navegador mientras dura la animación: el snap y
// nuestro rAF competían por el `scrollLeft`, y esa pelea era la causa real
// del salto brusco al final de cada transición.
function animateScrollTo(
  element: HTMLElement,
  target: number,
  cancelRef: { current: number | null },
  duration = 900
) {
  if (cancelRef.current !== null) cancelAnimationFrame(cancelRef.current);

  const start = element.scrollLeft;
  const change = target - start;
  const startTime = performance.now();

  element.style.scrollSnapType = 'none';

  const step = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1);
    element.scrollLeft = start + change * easeInOutCubic(progress);

    if (progress < 1) {
      cancelRef.current = requestAnimationFrame(step);
    } else {
      cancelRef.current = null;
      // Restauramos el snap nativo una vez asentada la tarjeta, para que
      // los gestos táctiles del usuario (swipe manual) lo sigan aprovechando.
      element.style.scrollSnapType = '';
    }
  };

  cancelRef.current = requestAnimationFrame(step);
}

export default function ProjectsApple({ dict }: ProjectsAppleProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollAnimationFrame = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // ─── NUEVO MOTOR DE SCROLL FLUIDO (ESTILO APPLE TV) ───────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollDirection = useRef<'forward' | 'backward'>('forward');

  // Combinamos texto (dict) con metadata estática (techs/image/links) por índice.
  // Se calcula en cada render pero es una operación barata (8 elementos).
  const projects: Project[] = (dict?.items ?? [])
    .slice(0, projectMeta.length)
    .map((item, i) => ({ ...item, ...projectMeta[i] }));

  // Función para deslizarse al centro matemático exacto de una tarjeta
  const scrollToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const cards = carouselRef.current.querySelectorAll('.project-card') as NodeListOf<HTMLElement>;
    
    if (cards[index]) {
      const carousel = carouselRef.current;
      const cardLeft = cards[index].offsetLeft;
      const cardWidth = cards[index].offsetWidth;
      const carouselWidth = carousel.offsetWidth;
      
      // Cálculo para centrar la tarjeta perfectamente
      const targetLeft = cardLeft - (carouselWidth / 2) + (cardWidth / 2);

      animateScrollTo(carousel, targetLeft, scrollAnimationFrame, 900);
      setCurrentIndex(index);
    }
  };

  // ─── EFECTO "COVERFLOW": escala y atenúa las tarjetas según su distancia
  // al centro del carrusel. Se actualiza en cada frame de scroll (rAF-throttled)
  // manipulando el DOM directamente vía refs, para no disparar un re-render de
  // React 60 veces por segundo mientras el usuario desliza.
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let frame: number | null = null;

    const updateCardTransforms = () => {
      const carouselRect = carousel.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;

      cardRefs.current.forEach((card) => {
        if (!card) return;
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(carouselCenter - cardCenter);
        const normalized = Math.min(distance / (carouselRect.width / 2), 1);

        const scale = 1 - normalized * 0.12;
        const opacity = 1 - normalized * 0.45;

        card.style.transform = `scale(${scale})`;
        card.style.opacity = `${opacity}`;
      });
    };

    const handleScroll = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateCardTransforms);
    };

    updateCardTransforms(); // estado inicial
    carousel.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [projects.length]);

  // Auto-Play Ping-Pong Fluido
  useEffect(() => {
    if (isHovered || activeProject || projects.length === 0) return;

    const interval = setInterval(() => {
      let nextIndex = currentIndex;

      if (scrollDirection.current === 'forward') {
        if (currentIndex >= projects.length - 1) {
          scrollDirection.current = 'backward';
          nextIndex = currentIndex - 1;
        } else {
          nextIndex = currentIndex + 1;
        }
      } else {
        if (currentIndex <= 0) {
          scrollDirection.current = 'forward';
          nextIndex = currentIndex + 1;
        } else {
          nextIndex = currentIndex - 1;
        }
      }

      scrollToIndex(nextIndex);
    }, 3200); // Deja ~2.3s de "reposo" tras la transición de 900ms para apreciar la card

    return () => clearInterval(interval);
  }, [currentIndex, isHovered, activeProject, projects.length]);

  // Controles Manuales
  const scrollManual = (direction: 'left' | 'right') => {
    let nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    
    // Evitar que se salga de los límites
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= projects.length) nextIndex = projects.length - 1;

    scrollDirection.current = direction === 'left' ? 'backward' : 'forward';
    scrollToIndex(nextIndex);
  };

  // Bloquear scroll del cuerpo cuando el Modal está abierto
  useEffect(() => {
    document.body.style.overflow = activeProject ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeProject]);

  // Programación defensiva: sin diccionario válido, no renderizamos nada roto.
  if (!dict?.items?.length) {
    console.error("Critical: 'dict.items' is missing in ProjectsApple");
    return null;
  }

  return (
    <section id="proyectos" className="py-24 w-full bg-white dark:bg-black transition-colors duration-500 relative">
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* CABECERA Y CONTROLES PC */}
      <div className="max-w-7xl mx-auto px-6 mb-8 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.header 
          initial={{ opacity: 0, y: 30 }} 
          whileInView={{ opacity: 1, y: 0 }} 
          viewport={{ once: true }} 
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-apple-blue font-semibold mb-3 text-sm uppercase tracking-widest">{dict.tag}</p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {dict.title}
          </h2>
        </motion.header>

        <div className="hidden md:flex gap-4 pb-2">
          <button onClick={() => scrollManual('left')} className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 active:scale-95">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <button onClick={() => scrollManual('right')} className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 active:scale-95">
            <ChevronRight size={24} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* CONTENEDOR CARRUSEL */}
      <div className="relative w-full">
        
        {/* Flechas Flotantes Móviles */}
        <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between z-30 pointer-events-none md:hidden">
          <button onClick={() => scrollManual('left')} className="pointer-events-auto w-10 h-10 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-lg flex items-center justify-center text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10 active:scale-95 transition-transform">
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
          <button onClick={() => scrollManual('right')} className="pointer-events-auto w-10 h-10 rounded-full bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-lg flex items-center justify-center text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10 active:scale-95 transition-transform">
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
              key={`project-${index}`} 
              ref={(el) => { cardRefs.current[index] = el; }}
              className="project-card group relative shrink-0 snap-center w-[85vw] md:w-[600px] h-[450px] md:h-[550px] rounded-[2rem] md:rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm origin-center transition-[transform,opacity,box-shadow] duration-300 ease-out will-change-transform"
              initial={{ opacity: 0, x: 50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              
              {/* 1. DISEÑO SAFARI INMERSIVO FULL-WIDTH */}
              <div className="absolute inset-0 pt-8 flex items-end">
                <div className="absolute top-0 inset-x-0 h-8 bg-zinc-100 dark:bg-black/80 border-b border-zinc-200 dark:border-white/10 flex items-center px-4 gap-1.5 z-20">
                   <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
                </div>

                <div className="relative w-full h-full overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="w-full h-full object-cover transition-transform duration-[2s] md:group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/100 via-black/40 to-black/20" />
                </div>
              </div>

              {/* 2. TEXTO INFERIOR */}
              <div className="absolute inset-x-0 bottom-0 p-8 md:p-10 transition-opacity duration-500 md:group-hover:opacity-0 z-30">
                 <div className="flex items-center gap-2 text-apple-blue mb-2">
                   <TerminalSquare size={16} />
                   <p className="font-mono text-xs uppercase tracking-widest">{project.category}</p>
                 </div>
                 <h3 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-md">{project.title}</h3>
                 
                 <button 
                   onClick={() => setActiveProject(project)}
                   className="mt-6 flex md:hidden items-center justify-center gap-2 w-full py-3.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white font-medium active:scale-95 transition-transform"
                 >
                   <MousePointerClick size={18} /> {dict.mobileCta}
                 </button>
              </div>

              {/* 3. PANEL DE CRISTAL (SOLO PC) */}
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
                   {project.comingSoon ? (
                     <span className="px-5 py-2.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold">
                       {dict.comingSoon ?? 'Próximamente'}
                     </span>
                   ) : (
                     <>
                       {project.github && (
                         <a href={project.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform text-sm">
                           <SiGithub className="w-4 h-4" /> {dict.codeLabel}
                         </a>
                       )}
                       {project.demo && (
                         <a href={project.demo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3.5 rounded-full text-white border border-white/20 hover:bg-white/10 transition-all text-sm font-semibold">
                           <ExternalLink size={16} /> {dict.demoLabel}
                         </a>
                       )}
                     </>
                   )}
                 </div>
              </div>

            </motion.div>
          ))}
          {/* Tarjeta final vacía para dar margen final */}
          <div className="shrink-0 w-6 md:w-[10vw]"></div>
        </div>
      </div>

      {/* 4. MODAL ESTILO APPLE (MÓVILES) */}
      <AnimatePresence>
        {activeProject && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
              
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setActiveProject(null)}
              className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col z-[101]"
            >
              <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-4 shrink-0 md:hidden" />

              <button 
                onClick={() => setActiveProject(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors z-10"
              >
                <X size={18} />
              </button>

              <div className="overflow-y-auto p-6 md:p-10 pb-12 no-scrollbar">
                <p className="text-apple-blue font-mono text-xs uppercase tracking-widest mb-2">{activeProject.category}</p>
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white mb-6">{activeProject.title}</h3>

                <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-black">
                  <img src={activeProject.image} alt={activeProject.title} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-full h-full object-cover" />
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

                <div className="flex flex-col sm:flex-row gap-4">
                  {activeProject.comingSoon ? (
                    <span className="flex items-center justify-center w-full px-6 py-3.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-semibold text-sm">
                      {dict.comingSoon ?? 'Próximamente'}
                    </span>
                  ) : (
                    <>
                      {activeProject.github && (
                        <a href={activeProject.github} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold active:scale-95 transition-transform text-sm">
                          <SiGithub className="w-4 h-4" /> {dict.viewCodeLabel}
                        </a>
                      )}
                      {activeProject.demo && (
                        <a href={activeProject.demo} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-full text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors text-sm font-semibold">
                          <ExternalLink className="w-4 h-4" /> {dict.demoLabel}
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}