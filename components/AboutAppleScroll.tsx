'use client';
import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Award, BookOpen, BrainCircuit, Target } from 'lucide-react';

// ─── 1. ILUSTRACIÓN ÉPICA: RED NEURONAL (IA) ─────────────────────────────────
function IllustrationBrain() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <filter id="glow-brain" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="grad-brain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <ellipse cx="140" cy="245" rx="60" ry="12" fill="#6d28d9" opacity="0.15" />
      <path d="M140 50 C95 50 60 85 55 120 C50 155 70 200 105 215 C120 222 130 225 140 224 C150 225 160 222 175 215 C210 200 230 155 225 120 C220 85 185 50 140 50 Z" 
            stroke="url(#grad-brain)" strokeWidth="1.5" fill="none" opacity="0.25" strokeDasharray="4 6" />
      <g stroke="url(#grad-brain)" strokeWidth="1.5" fill="none" filter="url(#glow-brain)" opacity="0.7">
        <path d="M140 50 L110 80 L80 90 L60 120 L80 150 L100 180 L140 224"><animate attributeName="opacity" values="0.4;1;0.4" dur="3s" repeatCount="indefinite" /></path>
        <path d="M110 80 L140 105 L110 135 L140 165 L100 180" />
        <path d="M140 50 L170 80 L200 90 L220 120 L200 150 L180 180 L140 224"><animate attributeName="opacity" values="0.4;1;0.4" dur="4s" repeatCount="indefinite" /></path>
        <path d="M170 80 L140 105 L170 135 L140 165 L180 180" />
        <line x1="110" y1="135" x2="170" y2="135" strokeDasharray="3 3"><animate attributeName="stroke-dashoffset" values="12;0" dur="1.5s" repeatCount="indefinite" /></line>
      </g>
      <g fill="#22d3ee" filter="url(#glow-brain)">
        <circle cx="140" cy="50" r="4" /><circle cx="110" cy="80" r="3" /><circle cx="170" cy="80" r="3" />
        <circle cx="140" cy="105" r="5.5" fill="#ffffff"><animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" /></circle>
        <circle cx="140" cy="165" r="5.5" fill="#ffffff"><animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite" /></circle>
      </g>
      <circle r="3" fill="#ffffff" filter="url(#glow-brain)"><animateMotion dur="2.5s" repeatCount="indefinite" path="M140 50 L110 80 L140 105 L170 135 L200 150" /></circle>
      <circle r="2.5" fill="#c084fc" filter="url(#glow-brain)"><animateMotion dur="3s" repeatCount="indefinite" path="M140 224 L100 180 L110 135 L80 90 L60 120" /></circle>
    </svg>
  );
}

// ─── 2. ILUSTRACIÓN ÉPICA: ARTEFACTO HOLOGRÁFICO (TROFEO) ────────────────────
function IllustrationTrophy() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <filter id="glow-trophy" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Base holográfica */}
      <ellipse cx="140" cy="230" rx="70" ry="15" fill="#ea580c" opacity="0.1" />
      <path d="M100 230 L180 230 L150 180 L130 180 Z" fill="url(#grad-gold)" opacity="0.2" />
      
      {/* Copa geométrica suspendida */}
      <polygon points="140,50 200,90 170,160 110,160 80,90" fill="none" stroke="url(#grad-gold)" strokeWidth="2" filter="url(#glow-trophy)">
         <animate attributeName="stroke-dasharray" values="0 300; 300 0" dur="4s" repeatCount="indefinite" />
      </polygon>
      <polygon points="140,50 200,90 170,160 110,160 80,90" fill="url(#grad-gold)" opacity="0.1" />
      
      {/* Núcleo de plasma */}
      <circle cx="140" cy="115" r="18" fill="#facc15" filter="url(#glow-trophy)">
        <animate attributeName="r" values="16;20;16" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="115" r="8" fill="#ffffff" filter="url(#glow-trophy)" />

      {/* Anillos de energía rotatorios */}
      <g stroke="#fde047" strokeWidth="2" fill="none" filter="url(#glow-trophy)" opacity="0.8">
        <ellipse cx="140" cy="115" rx="55" ry="15" strokeDasharray="20 10">
          <animateTransform attributeName="transform" type="rotate" values="0 140 115; 360 140 115" dur="6s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="140" cy="115" rx="25" ry="65" strokeDasharray="30 15" stroke="#fbbf24">
          <animateTransform attributeName="transform" type="rotate" values="360 140 115; 0 140 115" dur="8s" repeatCount="indefinite" />
        </ellipse>
      </g>
      
      {/* Rayo de escaneo láser */}
      <line x1="80" y1="90" x2="200" y2="90" stroke="#ffffff" strokeWidth="1" filter="url(#glow-trophy)">
        <animate attributeName="y1" values="50;160;50" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y2" values="50;160;50" dur="3s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

// ─── 3. ILUSTRACIÓN ÉPICA: GRIMORIO DIGITAL (LIBRO/MATRIZ) ───────────────────
function IllustrationBook() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <filter id="glow-book" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="grad-matrix" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
          <stop offset="50%" stopColor="#34d399" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a7f3d0" stopOpacity="1" />
        </linearGradient>
      </defs>
      
      {/* Proyección del holograma desde el libro */}
      <polygon points="140,160 60,60 220,60" fill="url(#grad-matrix)" opacity="0.3">
        <animate attributeName="opacity" values="0.1;0.4;0.1" dur="4s" repeatCount="indefinite" />
      </polygon>

      {/* Estructura holográfica 3D (Cubo de Rubik flotante) */}
      <g stroke="#6ee7b7" strokeWidth="1.5" fill="none" filter="url(#glow-book)">
        <polygon points="140,60 170,75 140,90 110,75" />
        <polygon points="110,75 140,90 140,120 110,105" />
        <polygon points="140,90 170,75 170,105 140,120" />
        <animateTransform attributeName="transform" type="translate" values="0,0; 0,-15; 0,0" dur="4s" repeatCount="indefinite" />
      </g>
      
      {/* Partículas de datos subiendo */}
      <g fill="#a7f3d0" filter="url(#glow-book)">
        <circle cx="120" cy="140" r="2"><animate attributeName="cy" values="160;40" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite"/></circle>
        <circle cx="160" cy="140" r="2.5"><animate attributeName="cy" values="170;50" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="2.5s" repeatCount="indefinite"/></circle>
        <circle cx="140" cy="140" r="1.5"><animate attributeName="cy" values="150;30" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.8s" repeatCount="indefinite"/></circle>
      </g>

      {/* Base del Libro Cyberpunk */}
      <path d="M140 185 L220 155 L220 170 L140 200 Z" fill="#064e3b" />
      <path d="M140 185 L60 155 L60 170 L140 200 Z" fill="#065f46" />
      <path d="M140 180 L210 150 L140 130 L70 150 Z" fill="none" stroke="#10b981" strokeWidth="2" filter="url(#glow-book)" />
      
      {/* Escaneo de páginas */}
      <line x1="70" y1="150" x2="140" y2="130" stroke="#a7f3d0" strokeWidth="2" filter="url(#glow-book)">
        <animate attributeName="x1" values="70;140;70" dur="3s" repeatCount="indefinite" />
        <animate attributeName="y1" values="150;180;150" dur="3s" repeatCount="indefinite" />
      </line>
    </svg>
  );
}

// ─── 4. ILUSTRACIÓN ÉPICA: CAZA ESTELAR HYPERDRIVE (COHETE) ──────────────────
function IllustrationRocket() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <filter id="glow-rocket" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="grad-engine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Estrellas a velocidad Warp (Líneas moviéndose hacia abajo) */}
      <g stroke="#60a5fa" strokeWidth="2" opacity="0.6">
        <line x1="40" y1="0" x2="40" y2="30"><animate attributeName="y1" values="-50;300" dur="0.6s" repeatCount="indefinite" /><animate attributeName="y2" values="0;350" dur="0.6s" repeatCount="indefinite" /></line>
        <line x1="240" y1="0" x2="240" y2="40"><animate attributeName="y1" values="-100;300" dur="0.8s" repeatCount="indefinite" /><animate attributeName="y2" values="-50;350" dur="0.8s" repeatCount="indefinite" /></line>
        <line x1="80" y1="0" x2="80" y2="20"><animate attributeName="y1" values="-20;300" dur="0.4s" repeatCount="indefinite" /><animate attributeName="y2" values="10;320" dur="0.4s" repeatCount="indefinite" /></line>
        <line x1="200" y1="0" x2="200" y2="50"><animate attributeName="y1" values="-80;300" dur="0.5s" repeatCount="indefinite" /><animate attributeName="y2" values="-10;370" dur="0.5s" repeatCount="indefinite" /></line>
      </g>

      <g transform="translate(0, 0)">
        <animateTransform attributeName="transform" type="translate" values="0,5; 0,-5; 0,5" dur="2s" repeatCount="indefinite" />
        
        {/* Propulsión de plasma (Motor trasero) */}
        <polygon points="140,190 120,250 140,280 160,250" fill="url(#grad-engine)" filter="url(#glow-rocket)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="0.1s" repeatCount="indefinite" />
        </polygon>

        {/* Alas tipo Caza Espacial */}
        <polygon points="140,100 60,180 100,190 140,160" fill="#1e3a8a" />
        <polygon points="140,100 220,180 180,190 140,160" fill="#1e3a8a" />
        <path d="M60 180 L100 190 L140 160 Z" fill="none" stroke="#60a5fa" strokeWidth="2" filter="url(#glow-rocket)" />
        <path d="M220 180 L180 190 L140 160 Z" fill="none" stroke="#60a5fa" strokeWidth="2" filter="url(#glow-rocket)" />

        {/* Chasis principal sleek */}
        <path d="M140 40 Q160 100 160 180 L120 180 Q120 100 140 40 Z" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" filter="url(#glow-rocket)" />
        
        {/* Cabina holográfica */}
        <polygon points="140,80 150,130 140,150 130,130" fill="#22d3ee" opacity="0.8" filter="url(#glow-rocket)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
        </polygon>
      </g>
    </svg>
  );
}

// ─── DATOS ───────────────────────────────────────────────────────────────────
const personalPanels = [
  {
    id: 1,
    title: 'Hola, soy CescJavier7.',
    description: 'Soy un Informático apasionado por el desarrollo de software con enfoque en ciberseguridad.',
    icon: BrainCircuit,
    Illustration: IllustrationBrain,
  },
  {
    id: 2,
    title: 'Un poco sobre mí',
    description: '📚 🎮 Soy un apasionado de la tecnología y los videojuegos (estrategia y rol 🕹️). Durante mis estudios, obtuve una beca al mérito académico en la Universidad Central del Ecuador. Me gusta innovar y aplicar habilidades como pensamiento crítico y trabajo en equipo 💡.',
    icon: Award,
    Illustration: IllustrationTrophy,
  },
  {
    id: 3,
    title: 'Más allá del código.',
    description: 'Me apasiona estudiar temas relacionados con ciencias exactas, tecnología e incluso filosofía para entender los principios que rigen los sistemas y el mundo, confieso que me apasiona mucho leer.',
    icon: BookOpen,
    Illustration: IllustrationBook,
  },
  {
    id: 4,
    title: 'Construir con propósito.',
    description: 'Mi objetivo es desarrollar herramientas y plataformas que involucren el correcto desarrollo y junto con estándares altos de ciberseguridad, ayudando a otros a crear software más seguro desde el inicio.',
    icon: Target,
    Illustration: IllustrationRocket,
  }
];

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────
export default function AboutAppleScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.25) setActiveIndex(0);
    else if (latest < 0.50) setActiveIndex(1);
    else if (latest < 0.75) setActiveIndex(2);
    else setActiveIndex(3);
  });

  return (
    <section ref={containerRef} className="relative h-[400vh] bg-white dark:bg-black transition-colors duration-500" id="sobre-mi">
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* LADO IZQUIERDO: TEXTOS */}
          <div className="relative h-[50vh] md:h-[60vh] flex items-center">
            {personalPanels.map((panel, i) => {
              const isActive = activeIndex === i;
              return (
                <motion.div
                  key={`txt-${panel.id}`}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    y: isActive ? 0 : (activeIndex > i ? -40 : 40),
                    filter: isActive ? 'blur(0px)' : 'blur(4px)',
                  }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col justify-center pr-0 md:pr-10 pointer-events-none"
                  style={{ zIndex: isActive ? 10 : 0, pointerEvents: isActive ? 'auto' : 'none' }}
                >
                  <div className="p-2 w-fit rounded-xl bg-apple-blue/10 mb-3 md:mb-4 border border-apple-blue/20">
                    <panel.icon className="w-5 h-5 md:w-6 md:h-6 text-apple-blue" />
                  </div>
                  <h2 className="text-3xl md:text-7xl font-bold tracking-tighter mb-3 md:mb-6 leading-tight text-zinc-900 dark:text-white">
                    {panel.title}
                  </h2>
                  <p className="text-base md:text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                    {panel.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* LADO DERECHO: ILUSTRACIONES SVG ÉPICAS */}
          <div className="relative aspect-square w-full max-w-[260px] md:max-w-md mx-auto rounded-3xl md:rounded-[3rem] overflow-hidden
                          bg-zinc-900 dark:bg-zinc-900
                          border border-white/10
                          shadow-2xl shadow-black/60">
            {personalPanels.map((panel, i) => {
              const isActive = activeIndex === i;
              return (
                <motion.div
                  key={`ill-${panel.id}`}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    scale: isActive ? 1 : 0.85,
                  }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 w-full h-full flex items-center justify-center p-6 md:p-8"
                  style={{ zIndex: isActive ? 10 : 0 }}
                >
                  <panel.Illustration />
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}