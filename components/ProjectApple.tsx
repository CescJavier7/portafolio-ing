'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig, useDragControls, useReducedMotion } from 'framer-motion';
import { useLenis } from 'lenis/react';
import { SiGithub } from 'react-icons/si';
import { ExternalLink, TerminalSquare, ChevronLeft, ChevronRight, X, MousePointerClick, Smartphone, Download, Mail, ArrowUpRight, Check } from 'lucide-react';
// Imágenes EMPAQUETADAS (no dependen de /public): Next las emite a _next/static,
// que siempre se copia al contenedor y se sirve. Fin del bug de "no cargan".
import sentraPreview from '@/public/sentra-preview.png';
import cvPreview from '@/public/cv-builder-preview.png';
import dartPreview from '@/public/dartshannon-preview.png';
// Captura real de la portada en producción y capturas reales de la APK 0.4.0
// (emulador Android 15) sobre el degradado del propio icono de NEXO.
import simuladoresPreview from '@/public/simuladores-preview.jpg';
import nexoPreview from '@/public/nexo-preview.jpg';

// ─── METADATA DE PROYECTOS (NO TRADUCIBLE) ───────────────────────────────────
// Assets, links y stack tecnológico no cambian entre idiomas. El orden es
// fijo y debe coincidir 1:1 con `dict.items`.
//  · badges: insignias discretas en la barra superior de la tarjeta.
//  · device: 'phone' cambia la barra de navegador por la de una app móvil.
//  · demoKind: 'visit' rotula el enlace como plataforma real, no como demo.
//  · apk: URL pública de descarga. Vacía → «Solicitar APK» (lleva a contacto).
type ProjectBadge = 'production' | 'client' | 'android';
const projectMeta: {
  techs: string[];
  image: string;
  github: string;
  demo: string;
  comingSoon?: boolean;
  badges?: ProjectBadge[];
  device?: 'phone';
  demoKind?: 'visit';
  apk?: string;
}[] = [
  {
    // Sentra — SaaS insignia de seguridad web.
    techs: ["FastAPI", "Next.js 16", "PostgreSQL", "Redis", "Docker", "Traefik", "Groq LLM"],
    image: sentraPreview.src,
    github: "",
    demo: "https://cescjavier.dev/es/sentinel"
  },
  {
    // Simuladores de admisión — proyecto para cliente (academia Cambridge).
    // Sin repositorio público: solo el enlace a producción.
    techs: ["Next.js 16", "React 19", "TypeScript", "PostgreSQL 16", "Drizzle ORM", "Better Auth", "Groq LLM", "PayPhone", "Docker · Traefik", "Playwright"],
    image: simuladoresPreview.src,
    github: "",
    demo: "https://simuladores.cescjavier.dev/",
    badges: ["production", "client"],
    demoKind: "visit"
  },
  {
    // AI ATS-Resume Builder — el generador de CV actual.
    techs: ["FastAPI", "Groq LLM", "n8n + Notion", "Tesseract OCR", "Next.js", "driver.js"],
    image: cvPreview.src,
    github: "",
    demo: "https://cescjavier.dev/es/herramientas/cv"
  },
  {
    // DartShannon (Ficha Viva) — proyecto estrella. Funciona; no desplegado.
    techs: ["Go 1.26 (sin framework)", "PostgreSQL + PostGIS", "H3 · TimescaleDB", "React 19 · Vite", "AES-256-GCM", "JWT propio (80 líneas)", "PWA"],
    image: dartPreview.src,
    github: "",
    demo: "",
    comingSoon: true
  },
  {
    // NEXO — app Android (Expo) con servidor propio desplegado en el VPS. No
    // está en Google Play: la APK firmada se comparte directamente. Cuando
    // exista una URL pública estable de descarga, ponerla en `apk`.
    techs: ["React Native 0.86", "Expo SDK 57", "TypeScript", "Expo Router", "SQLite", "ML Kit (on-device)", "FastAPI", "PostgreSQL 16"],
    image: nexoPreview.src,
    github: "",
    demo: "",
    badges: ["android"],
    device: "phone",
    apk: ""
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
type ProjectStatusKind = 'done' | 'partial' | 'pending' | 'info';

interface ProjectItemDictionary {
  title: string;
  category: string;
  // Resumen de 1–2 líneas para la vista compacta de la tarjeta.
  summary?: string;
  description: string;
  // Funcionalidades principales (solo en el modal; se omite si no hay datos).
  features?: string[];
  // Estado real por funcionalidad. `kind` llega como string desde el JSON.
  status?: { kind: string; text: string }[];
}

interface ProjectsDictionary {
  tag: string;
  title: string;
  mobileCta: string;
  codeLabel: string;
  viewCodeLabel: string;
  demoLabel: string;
  comingSoon?: string;
  visitLabel?: string;
  requestApkLabel?: string;
  downloadApkLabel?: string;
  apkNote?: string;
  statusTitle?: string;
  statusLabels?: Partial<Record<ProjectStatusKind, string>>;
  badges?: Record<ProjectBadge, string>;
  readMoreLabel?: string;
  closeLabel?: string;
  prevLabel?: string;
  nextLabel?: string;
  featuresTitle?: string;
  techTitle?: string;
  aboutTitle?: string;
  items: ProjectItemDictionary[];
}

interface ProjectsAppleProps {
  dict?: ProjectsDictionary;
}

type Project = ProjectItemDictionary & (typeof projectMeta)[number];

const CARD_TECHS = 3; // tecnologías visibles en la vista compacta
const AUTOPLAY_MS = 3200;
const SCROLL_MS = 900;
const RESUME_AFTER_MS = 6000; // pausa del autoplay tras un gesto manual
const EASE = [0.16, 1, 0.3, 1] as const;

// ─── EASING (CURVA PROPIA, MÁS "APPLE" QUE EL scroll-behavior NATIVO) ────────
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Scroll animado a mano con requestAnimationFrame: nos da control total sobre
// la duración y la curva, evitando la inconsistencia del "smooth" nativo entre
// navegadores. `cancelRef` aborta una animación en curso si llega otra (evita
// el "tirón" al hacer clic rápido en las flechas). El scroll-snap nativo se
// desactiva mientras dura: el snap y el rAF competían por el `scrollLeft`.
// Con `duration <= 0` (movimiento reducido) salta directamente.
function animateScrollTo(
  element: HTMLElement,
  target: number,
  cancelRef: { current: number | null },
  duration = SCROLL_MS
) {
  if (cancelRef.current !== null) cancelAnimationFrame(cancelRef.current);
  cancelRef.current = null;

  if (duration <= 0) {
    element.scrollLeft = target;
    return;
  }

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
  const [hasFocus, setHasFocus] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const reduceMotion = useReducedMotion();

  // Dispositivo TÁCTIL: la tarjeta se abre al TOCAR (modal). La vista ampliada
  // por hover la decide CSS (@media (hover: hover)), no este estado, así que no
  // se monta y desmonta nada al hidratar.
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none), (pointer: coarse)').matches);
  }, []);

  // Índice de la tarjeta centrada. El ref es la fuente de verdad para el
  // autoplay y las flechas; el estado solo sirve para deshabilitar las flechas.
  const indexRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollDirection = useRef<'forward' | 'backward'>('forward');
  const pausedUntil = useRef(0);
  const pauseAutoplay = () => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
  };

  // Texto (dict) + metadata estática (techs/image/links) por índice.
  const projects: Project[] = useMemo(
    () => (dict?.items ?? []).slice(0, projectMeta.length).map((item, i) => ({ ...item, ...projectMeta[i] })),
    [dict?.items]
  );

  // Desliza hasta centrar exactamente una tarjeta.
  const scrollToIndex = useCallback(
    (index: number) => {
      const carousel = carouselRef.current;
      const card = cardRefs.current[index];
      if (!carousel || !card) return;
      const targetLeft = card.offsetLeft - carousel.offsetWidth / 2 + card.offsetWidth / 2;
      animateScrollTo(carousel, targetLeft, scrollAnimationFrame, reduceMotion ? 0 : SCROLL_MS);
      indexRef.current = index;
      setCurrentIndex(index);
    },
    [reduceMotion]
  );

  // ─── EFECTO "COVERFLOW" ───────────────────────────────────────────────────
  // Escala y atenúa cada tarjeta según su distancia al centro, en cada frame de
  // scroll (rAF) y directamente en el DOM, sin re-render de React. Este es el
  // ÚNICO que escribe `transform`/`opacity` en `.project-card` (antes competía
  // con la animación de entrada de framer y con una transición CSS de 300 ms,
  // que hacían que las tarjetas saltaran o fueran "a destiempo" del scroll).
  // También sincroniza el índice con el scroll manual (swipe/trackpad): antes
  // las flechas y el autoplay saltaban desde un índice viejo.
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    let frame: number | null = null;

    const update = () => {
      const rect = carousel.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      let closest = 0;
      let best = Infinity;

      cardRefs.current.forEach((card, i) => {
        if (!card) return;
        const r = card.getBoundingClientRect();
        const distance = Math.abs(center - (r.left + r.width / 2));
        if (distance < best) {
          best = distance;
          closest = i;
        }
        const normalized = Math.min(distance / (rect.width / 2), 1);
        card.style.transform = `scale(${1 - normalized * 0.12})`;
        card.style.opacity = `${1 - normalized * 0.45}`;
      });

      if (scrollAnimationFrame.current === null && closest !== indexRef.current) {
        indexRef.current = closest;
        setCurrentIndex(closest);
      }
    };

    const onScroll = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    carousel.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      carousel.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [projects.length]);

  // ─── AUTOPLAY PING-PONG ───────────────────────────────────────────────────
  // Un único intervalo estable (no se recrea en cada paso). Se detiene con el
  // puntero encima, con el foco dentro, con el modal abierto y con movimiento
  // reducido; tras un gesto manual espera RESUME_AFTER_MS antes de seguir.
  useEffect(() => {
    if (reduceMotion || isHovered || hasFocus || activeProject || projects.length < 2) return;

    const interval = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const current = indexRef.current;
      if (current >= projects.length - 1) scrollDirection.current = 'backward';
      else if (current <= 0) scrollDirection.current = 'forward';
      scrollToIndex(current + (scrollDirection.current === 'forward' ? 1 : -1));
    }, AUTOPLAY_MS);

    return () => clearInterval(interval);
  }, [reduceMotion, isHovered, hasFocus, activeProject, projects.length, scrollToIndex]);

  // Al entrar el puntero, pausar el autoplay no basta: si había un deslizamiento
  // de 900 ms en curso, la tarjeta seguía moviéndose bajo el puntero y su vista
  // ampliada aparecía y desaparecía. Se asienta en 220 ms sobre la más cercana.
  const handlePointerEnter = () => {
    setIsHovered(true);
    const carousel = carouselRef.current;
    if (!carousel || scrollAnimationFrame.current === null) return;
    const center = carousel.scrollLeft + carousel.offsetWidth / 2;
    let closest = indexRef.current;
    let best = Infinity;
    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (d < best) {
        best = d;
        closest = i;
      }
    });
    const card = cardRefs.current[closest];
    if (!card) return;
    animateScrollTo(carousel, card.offsetLeft - carousel.offsetWidth / 2 + card.offsetWidth / 2, scrollAnimationFrame, reduceMotion ? 0 : 220);
    indexRef.current = closest;
    setCurrentIndex(closest);
  };

  const scrollManual = (direction: 'left' | 'right') => {
    pauseAutoplay();
    const next = Math.min(Math.max(indexRef.current + (direction === 'left' ? -1 : 1), 0), projects.length - 1);
    scrollDirection.current = direction === 'left' ? 'backward' : 'forward';
    scrollToIndex(next);
  };

  // Programación defensiva: sin diccionario válido, no renderizamos nada roto.
  if (!dict?.items?.length) {
    console.error("Critical: 'dict.items' is missing in ProjectsApple");
    return null;
  }

  const arrowBase =
    'flex items-center justify-center rounded-full transition-[background-color,opacity,transform] active:scale-95 disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue';

  return (
    <MotionConfig reducedMotion="user">
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
            transition={{ duration: 0.8, ease: EASE }}
          >
            <p className="text-apple-blue font-semibold mb-3 text-sm uppercase tracking-widest">{dict.tag}</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {dict.title}
            </h2>
          </motion.header>

          <div className="hidden md:flex gap-4 pb-2">
            <button type="button" aria-label={dict.prevLabel} disabled={currentIndex === 0} onClick={() => scrollManual('left')} className={`w-12 h-12 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 ${arrowBase}`}>
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <button type="button" aria-label={dict.nextLabel} disabled={currentIndex === projects.length - 1} onClick={() => scrollManual('right')} className={`w-12 h-12 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 ${arrowBase}`}>
              <ChevronRight size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* CONTENEDOR CARRUSEL */}
        <div className="relative w-full">
          {/* Flechas flotantes móviles */}
          <div className="absolute inset-y-0 left-2 right-2 flex items-center justify-between z-50 pointer-events-none md:hidden">
            <button type="button" aria-label={dict.prevLabel} disabled={currentIndex === 0} onClick={() => scrollManual('left')} className={`pointer-events-auto w-10 h-10 bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-lg text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10 ${arrowBase}`}>
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            <button type="button" aria-label={dict.nextLabel} disabled={currentIndex === projects.length - 1} onClick={() => scrollManual('right')} className={`pointer-events-auto w-10 h-10 bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-lg text-zinc-800 dark:text-white border border-zinc-200 dark:border-white/10 ${arrowBase}`}>
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div
            ref={carouselRef}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={pauseAutoplay}
            onWheel={pauseAutoplay}
            onFocus={() => setHasFocus(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHasFocus(false);
            }}
            className="flex overflow-x-auto snap-x snap-mandatory gap-6 px-6 md:px-[10vw] pb-12 w-full no-scrollbar relative z-20"
          >
            {projects.map((project, index) => (
              <ProjectCard
                key={project.title}
                project={project}
                dict={dict}
                isTouch={isTouch}
                cardRef={(el) => { cardRefs.current[index] = el; }}
                onOpen={() => setActiveProject(project)}
                onFocusCard={() => {
                  // Teclado: centrar la tarjeta que recibe el foco.
                  if (!isTouch && indexRef.current !== index) scrollToIndex(index);
                }}
              />
            ))}
            {/* Margen final */}
            <div className="shrink-0 w-6 md:w-[10vw]"></div>
          </div>
        </div>

        <AnimatePresence>
          {activeProject && (
            <ProjectModal key={activeProject.title} project={activeProject} dict={dict} onClose={() => setActiveProject(null)} />
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}

// ─── TARJETA ──────────────────────────────────────────────────────────────────
// Dos vistas con límites FIJOS (la tarjeta nunca cambia de tamaño):
//  · Compacta (siempre): categoría, título, resumen de 2 líneas y 3 tecnologías.
//  · Ampliada (hover o foco, solo con puntero fino): descripción ajustada al
//    espacio libre + TODAS las tecnologías y las acciones fijadas abajo. Solo
//    anima opacity/transform; nunca height ni overflow.
function ProjectCard({
  project,
  dict,
  isTouch,
  cardRef,
  onOpen,
  onFocusCard,
}: {
  project: Project;
  dict: ProjectsDictionary;
  isTouch: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  onOpen: () => void;
  onFocusCard: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);
  const hasExtra = !!(project.features?.length || project.status?.length);
  const showReadMore = (descOverflows || hasExtra) && !!dict.readMoreLabel;
  const extraTechs = project.techs.length - CARD_TECHS;

  return (
    <div
      ref={cardRef}
      onClick={() => { if (isTouch) onOpen(); }}
      onFocus={onFocusCard}
      className={`project-card group relative shrink-0 snap-center w-[85vw] md:w-[600px] h-[470px] md:h-[550px] rounded-[2rem] md:rounded-[2.5rem] bg-zinc-200 dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 overflow-hidden shadow-sm origin-center will-change-transform ${isTouch ? 'cursor-pointer' : ''}`}
    >
      {/* Barra superior: navegador (web) o teléfono (app móvil) */}
      <div className="absolute top-0 inset-x-0 h-8 bg-zinc-100 dark:bg-black/80 border-b border-zinc-200 dark:border-white/10 flex items-center px-4 gap-1.5 z-50">
        {project.device === 'phone' ? (
          <Smartphone size={14} className="text-zinc-500" aria-hidden />
        ) : (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
          </>
        )}
        <ProjectBadges badges={project.badges} labels={dict.badges} />
      </div>

      {/* Imagen a sangre */}
      <div className="absolute inset-x-0 top-8 bottom-0 overflow-hidden">
        {imgFailed || !project.image ? (
          <ProjectPlaceholder title={project.title} />
        ) : (
          <img
            src={project.image}
            alt=""
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-[2s] motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black from-40% md:from-25% via-black/80 via-65% md:via-50% to-black/10" />
      </div>

      {/* 1. VISTA COMPACTA */}
      <div className="absolute inset-x-0 bottom-0 p-6 pt-20 md:p-10 md:pt-24 z-30 bg-gradient-to-t from-black via-black/90 via-60% to-transparent">
        <div className="flex items-center gap-2 text-apple-blue mb-2">
          <TerminalSquare size={16} aria-hidden />
          <p className="font-mono text-xs uppercase tracking-widest truncate">{project.category}</p>
        </div>
        <h3 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-md line-clamp-2">{project.title}</h3>
        <p className="text-sm md:text-[15px] leading-snug text-zinc-300 line-clamp-2 mb-4">
          {project.summary ?? project.description}
        </p>
        <ul className="flex flex-wrap gap-2" aria-label={dict.techTitle}>
          {project.techs.slice(0, CARD_TECHS).map((tech) => (
            <li key={tech} className="px-2.5 py-1 text-[11px] md:text-xs font-semibold rounded-md bg-white/10 text-zinc-200 border border-white/10">
              {tech}
            </li>
          ))}
          {extraTechs > 0 && (
            <li className="px-2.5 py-1 text-[11px] md:text-xs font-semibold rounded-md text-zinc-400">+{extraTechs}</li>
          )}
        </ul>
        {/* Táctil: botón explícito (no hay hover) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className="mt-5 flex [@media(hover:hover)]:hidden items-center justify-center gap-2 w-full py-3 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm font-medium active:scale-95 transition-transform"
        >
          <MousePointerClick size={18} /> {dict.mobileCta}
        </button>
      </div>

      {/* 2. VISTA AMPLIADA (solo con puntero que admite hover, o con foco) */}
      <div className="absolute inset-x-0 bottom-0 top-8 z-40 flex flex-col p-8 md:p-10 bg-black/90 backdrop-blur-xl opacity-0 translate-y-2 pointer-events-none transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none motion-reduce:translate-y-0 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto [@media(hover:none)]:hidden">
        <div className="shrink-0">
          <p className="text-apple-blue font-mono text-xs uppercase tracking-widest mb-2 truncate">{project.category}</p>
          <h3 className="text-2xl md:text-3xl font-bold text-white line-clamp-2">{project.title}</h3>
        </div>

        <FitDescription text={project.description} onOverflowChange={setDescOverflows} className="flex-1 min-h-0 mt-3" />

        <div className="shrink-0 pt-5">
          <ul className="flex flex-wrap gap-2" aria-label={dict.techTitle}>
            {project.techs.map((tech) => (
              <li key={tech} className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white/10 text-zinc-200 border border-white/10">
                {tech}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 mt-5">
            <ProjectActions project={project} dict={dict} variant="panel" />
            {showReadMore && (
              <button
                type="button"
                onClick={onOpen}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-semibold text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue"
              >
                {dict.readMoreLabel} <ArrowUpRight size={15} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Descripción que se ajusta al espacio libre: calcula cuántas líneas COMPLETAS
// caben (sin cortar una línea a la mitad) y aplica line-clamp con puntos
// suspensivos. Informa si el texto quedó truncado para mostrar «Leer más».
function FitDescription({
  text,
  onOverflowChange,
  className = '',
}: {
  text: string;
  onOverflowChange: (overflows: boolean) => void;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [lines, setLines] = useState<number | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    const p = textRef.current;
    if (!box || !p) return;

    const measure = () => {
      if (!box.clientHeight) return; // oculto (táctil): no hay nada que medir
      const lineHeight = parseFloat(getComputedStyle(p).lineHeight) || 22;
      const n = Math.max(2, Math.floor(box.clientHeight / lineHeight));
      p.style.webkitLineClamp = String(n);
      setLines(n);
      onOverflowChange(p.scrollHeight > p.clientHeight + 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [text, onOverflowChange]);

  return (
    <div ref={boxRef} className={`overflow-hidden ${className}`}>
      <p
        ref={textRef}
        style={{ WebkitLineClamp: lines ?? undefined }}
        className="text-zinc-300 text-[14px] leading-relaxed text-pretty overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]"
      >
        {text}
      </p>
    </div>
  );
}

// ─── MODAL DE DETALLES ────────────────────────────────────────────────────────
// Hoja inferior en móvil (con arrastre para cerrar) y panel centrado en
// escritorio. Escape cierra, el foco entra al abrir, queda atrapado dentro y
// vuelve al disparador al cerrar. Pausa Lenis: `overflow:hidden` no basta con
// scroll suave, y por eso el fondo se desplazaba mientras el modal estaba abierto.
function ProjectModal({ project, dict, onClose }: { project: Project; dict: ProjectsDictionary; onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragControls = useDragControls();
  const lenis = useLenis();
  const [imgFailed, setImgFailed] = useState(false);
  const [isSheet] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);

  // `onClose` cambia en cada render del padre: se guarda en un ref para que el
  // efecto de montaje corra UNA sola vez (si no, cada re-render devolvía el foco
  // a la tarjeta y lo recuperaba, con un parpadeo del foco y de Lenis).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    lenis?.stop();
    return () => lenis?.start();
  }, [lenis]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  const sectionTitle = 'text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3';

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
      />

      <motion.div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-modal-title"
        initial={isSheet ? { y: '100%' } : { y: 24, opacity: 0, scale: 0.98 }}
        animate={isSheet ? { y: 0 } : { y: 0, opacity: 1, scale: 1 }}
        exit={isSheet ? { y: '100%' } : { y: 16, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.4, ease: EASE }}
        drag={isSheet ? 'y' : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) onClose();
        }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl max-h-[90vh] flex flex-col z-[101]"
      >
        {/* Barra de arrastre (móvil) */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="w-full pt-4 pb-2 shrink-0 md:hidden flex justify-center cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
        </div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={dict.closeLabel ?? 'Cerrar'}
          className="absolute top-4 right-4 md:top-6 md:right-6 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue"
        >
          <X size={18} />
        </button>

        <div data-lenis-prevent className="overflow-y-auto overscroll-contain p-6 md:p-10 pb-12 no-scrollbar">
          <p className="text-apple-blue font-mono text-xs uppercase tracking-widest mb-2 pr-12">{project.category}</p>
          <h3 id="project-modal-title" className="text-3xl font-bold text-zinc-900 dark:text-white mb-4 pr-10">{project.title}</h3>
          <ProjectBadges badges={project.badges} labels={dict.badges} className="mb-6" />

          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-8 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-black relative">
            {imgFailed || !project.image ? (
              <ProjectPlaceholder title={project.title} />
            ) : (
              <img src={project.image} alt={project.title} onError={() => setImgFailed(true)} className="w-full h-full object-cover" />
            )}
          </div>

          <section className="mb-8">
            {dict.aboutTitle && <h4 className={sectionTitle}>{dict.aboutTitle}</h4>}
            <p className="text-zinc-700 dark:text-zinc-300 text-base md:text-[17px] leading-relaxed text-pretty">{project.description}</p>
          </section>

          {project.features?.length ? (
            <section className="mb-8">
              {dict.featuresTitle && <h4 className={sectionTitle}>{dict.featuresTitle}</h4>}
              <ul className="space-y-2.5">
                {project.features.map((f) => (
                  <li key={f} className="flex gap-3 text-[15px] leading-snug text-zinc-700 dark:text-zinc-300">
                    <Check size={16} className="mt-0.5 shrink-0 text-apple-blue" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ProjectStatus status={project.status} title={dict.statusTitle} labels={dict.statusLabels} />

          <section className="mb-10">
            {dict.techTitle && <h4 className={sectionTitle}>{dict.techTitle}</h4>}
            <ul className="flex flex-wrap gap-2">
              {project.techs.map((tech) => (
                <li key={tech} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                  {tech}
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            <ProjectActions project={project} dict={dict} variant="modal" onNavigate={onClose} />
          </div>
          {project.device === 'phone' && !project.apk && dict.apkNote && (
            <p className="mt-4 text-xs text-center sm:text-left text-zinc-500 dark:text-zinc-400">{dict.apkNote}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── PIEZAS COMPARTIDAS ───────────────────────────────────────────────────────

// Rótulo del enlace principal: «Visitar plataforma» para productos reales en
// producción; «Live Demo» para el resto.
function demoLabelFor(project: Project, dict: ProjectsDictionary) {
  return project.demoKind === 'visit' ? (dict.visitLabel ?? dict.demoLabel) : dict.demoLabel;
}

// Acciones (código, demo/plataforma, APK) con estilos para el panel oscuro de
// la tarjeta o para el modal. El primer enlace es el principal (relleno).
function ProjectActions({
  project,
  dict,
  variant,
  onNavigate,
}: {
  project: Project;
  dict: ProjectsDictionary;
  variant: 'panel' | 'modal';
  onNavigate?: () => void;
}) {
  const panel = variant === 'panel';
  const size = panel ? 'px-5 py-2.5 text-sm' : 'w-full sm:w-auto px-6 py-3.5 text-sm';
  const ring = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue';
  const primary = panel
    ? `bg-white text-black hover:scale-[1.03] ${ring}`
    : `bg-zinc-900 text-white dark:bg-white dark:text-black active:scale-95 ${ring}`;
  const secondary = panel
    ? `text-white border border-white/20 hover:bg-white/10 ${ring}`
    : `text-zinc-900 dark:text-white border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${ring}`;
  const base = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background-color] ${size}`;

  if (project.comingSoon) {
    return (
      <span className={`${base} ${panel ? 'bg-white/10 border border-white/20 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'}`}>
        {dict.comingSoon ?? 'Próximamente'}
      </span>
    );
  }

  const links: React.ReactNode[] = [];
  if (project.github) {
    links.push(
      <a key="gh" href={project.github} target="_blank" rel="noopener noreferrer" className={`${base} ${primary}`}>
        <SiGithub className="w-4 h-4" /> {panel ? dict.codeLabel : dict.viewCodeLabel}
      </a>
    );
  }
  if (project.demo) {
    links.push(
      <a key="demo" href={project.demo} target="_blank" rel="noopener noreferrer" className={`${base} ${links.length ? secondary : primary}`}>
        <ExternalLink size={16} /> {demoLabelFor(project, dict)}
      </a>
    );
  }
  if (project.device === 'phone') {
    const cls = `${base} ${links.length ? secondary : primary}`;
    if (project.apk) {
      links.push(
        <a key="apk" href={project.apk} download className={cls}>
          <Download size={16} /> {dict.downloadApkLabel ?? 'APK'}
        </a>
      );
    } else if (dict.requestApkLabel) {
      links.push(
        <a key="apk" href="#contacto" onClick={onNavigate} className={cls}>
          <Mail size={16} /> {dict.requestApkLabel}
        </a>
      );
    }
  }
  return <>{links}</>;
}

// Insignias discretas (En producción, Proyecto para cliente, Android).
function ProjectBadges({
  badges,
  labels,
  className = 'ml-auto',
}: {
  badges?: ProjectBadge[];
  labels?: Record<ProjectBadge, string>;
  className?: string;
}) {
  if (!badges?.length || !labels) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => (
        <span
          key={b}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-600 dark:text-zinc-300 bg-zinc-200/70 dark:bg-white/10"
        >
          {b === 'production' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />}
          {labels[b]}
        </span>
      ))}
    </div>
  );
}

const STATUS_DOT: Record<ProjectStatusKind, string> = {
  done: 'bg-emerald-500',
  partial: 'bg-amber-400',
  pending: 'bg-zinc-400',
  info: 'bg-sky-500',
};

// Estado real: distingue lo que funciona, lo limitado, lo pendiente y los
// datos de distribución (que no son estado de desarrollo).
function ProjectStatus({
  status,
  title,
  labels,
}: {
  status?: ProjectItemDictionary['status'];
  title?: string;
  labels?: Partial<Record<ProjectStatusKind, string>>;
}) {
  if (!status?.length) return null;
  return (
    <section className="mb-8">
      {title && <h4 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-3">{title}</h4>}
      <ul className="space-y-2">
        {status.map((s) => {
          const kind: ProjectStatusKind = s.kind in STATUS_DOT ? (s.kind as ProjectStatusKind) : 'info';
          return (
            <li key={s.text} className="flex gap-3 text-[15px] leading-snug text-zinc-700 dark:text-zinc-300">
              <span className={`mt-1.5 w-2 h-2 shrink-0 rounded-full ${STATUS_DOT[kind]}`} aria-hidden />
              <span>
                {labels?.[kind] && <span className="font-semibold text-zinc-900 dark:text-white">{labels[kind]} · </span>}
                {s.text}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Placeholder con marca cuando una imagen no está disponible (evita la tarjeta
// en negro). Fondo degradado + patrón de puntos + icono de terminal + título.
function ProjectPlaceholder({ title }: { title: string }) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(#60a5fa 1px, transparent 1px)', backgroundSize: '22px 22px' }}
      />
      <TerminalSquare className="relative w-14 h-14 text-apple-blue/70" strokeWidth={1.5} />
      <p className="relative font-mono text-sm text-zinc-400 tracking-wide px-6 text-center">{title}</p>
    </div>
  );
}
