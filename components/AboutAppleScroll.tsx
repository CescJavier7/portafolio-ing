'use client';
import { useRef, useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Award, BookOpen, BrainCircuit, Target } from 'lucide-react';

// ─── ILUSTRACIONES SVG (Tus diseños intactos) ───────────────────────────────

function IllustrationBrain() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <radialGradient id="brain-glow" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="45%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6d28d9" />
        </radialGradient>
      </defs>
      <ellipse cx="140" cy="230" rx="70" ry="14" fill="#7c3aed" opacity="0.15" />
      <path d="M140 60 C95 60 58 88 52 125 C46 162 62 198 95 215 C110 222 125 225 140 224 L140 60Z" fill="url(#brain-glow)" />
      <path d="M140 60 C185 60 222 88 228 125 C234 162 218 198 185 215 C170 222 155 225 140 224 L140 60Z" fill="url(#brain-glow)" opacity="0.9" />
      <path d="M140 62 C141 120 139 180 140 222" stroke="#c4b5fd" strokeWidth="1.5" opacity="0.5" strokeDasharray="4 3" />
      <path d="M80 105 Q100 88 115 105 Q125 92 138 102" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />
      <path d="M72 130 Q92 115 108 130 Q122 116 136 128" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />
      <path d="M76 155 Q95 142 110 155 Q124 142 137 153" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
      <path d="M200 105 Q180 88 165 105 Q155 92 142 102" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />
      <path d="M208 130 Q188 115 172 130 Q158 116 144 128" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.35" />
      <path d="M204 155 Q185 142 170 155 Q156 142 143 153" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.3" />
      <ellipse cx="108" cy="88" rx="22" ry="14" fill="white" opacity="0.2" transform="rotate(-25 108 88)" />
      <ellipse cx="100" cy="82" rx="8" ry="5" fill="white" opacity="0.4" transform="rotate(-25 100 82)" />
      <circle cx="46" cy="120" r="5" fill="#c084fc" opacity="0.8">
        <animate attributeName="cy" values="120;108;120" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="234" cy="140" r="4" fill="#a78bfa" opacity="0.7">
        <animate attributeName="cy" values="140;128;140" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="140" cy="42" r="6" fill="#7c3aed" opacity="0.5">
        <animate attributeName="cy" values="42;34;42" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function IllustrationTrophy() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <radialGradient id="trophy-gold" cx="35%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="trophy-base-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <linearGradient id="stem-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>
      <ellipse cx="140" cy="242" rx="55" ry="10" fill="#92400e" opacity="0.2" />
      <rect x="90" y="228" width="100" height="14" rx="7" fill="url(#trophy-base-grad)" />
      <rect x="100" y="216" width="80" height="16" rx="5" fill="url(#trophy-base-grad)" />
      <rect x="124" y="178" width="32" height="42" rx="4" fill="url(#stem-grad)" />
      <path d="M80 95 Q48 95 48 128 Q48 158 80 162" stroke="url(#trophy-gold)" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M200 95 Q232 95 232 128 Q232 158 200 162" stroke="url(#trophy-gold)" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d="M80 62 L80 162 Q80 178 140 178 Q200 178 200 162 L200 62 Z" fill="url(#trophy-gold)" />
      <ellipse cx="118" cy="90" rx="16" ry="28" fill="white" opacity="0.15" transform="rotate(-10 118 90)" />
      <ellipse cx="112" cy="82" rx="6" ry="12" fill="white" opacity="0.3" transform="rotate(-10 112 82)" />
      <path d="M140 88 L145 103 L161 103 L148 113 L153 128 L140 118 L127 128 L132 113 L119 103 L135 103 Z" fill="white" opacity="0.9" />
      <circle cx="140" cy="48" r="5" fill="#fde68a" opacity="0.6">
        <animate attributeName="cy" values="48;40;48" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="88" cy="72" r="3" fill="#fef9c3" opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="195" cy="80" r="2.5" fill="#fef9c3" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function IllustrationBook() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <radialGradient id="book-cover" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <radialGradient id="book-pages" cx="60%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#d1d5db" />
        </radialGradient>
        <radialGradient id="coffee-grad" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
      </defs>
      <ellipse cx="130" cy="235" rx="75" ry="12" fill="#064e3b" opacity="0.15" />
      <path d="M148 80 L148 210 Q148 218 200 215 L235 210 L235 75 Q200 78 148 80Z" fill="url(#book-pages)" />
      <line x1="162" y1="100" x2="222" y2="98" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
      <line x1="162" y1="114" x2="222" y2="112" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
      <line x1="162" y1="128" x2="222" y2="126" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
      <line x1="162" y1="142" x2="222" y2="140" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
      <line x1="162" y1="156" x2="200" y2="155" stroke="#9ca3af" strokeWidth="1.5" opacity="0.5" />
      <path d="M148 80 L148 210 Q148 218 96 215 L48 210 L48 75 Q96 78 148 80Z" fill="url(#book-cover)" />
      <ellipse cx="80" cy="108" rx="8" ry="20" fill="white" opacity="0.22" transform="rotate(-5 80 108)" />
      <rect x="62" y="120" width="72" height="8" rx="4" fill="white" opacity="0.4" />
      <rect x="68" y="134" width="60" height="6" rx="3" fill="white" opacity="0.25" />
      <path d="M148 80 L148 210 Q148 216 144 215 L140 214 L140 79 Q144 78 148 80Z" fill="#065f46" />
      <path d="M185 148 L185 175 Q185 185 205 185 Q225 185 225 175 L225 148 Z" fill="url(#coffee-grad)" />
      <ellipse cx="205" cy="148" rx="20" ry="7" fill="#d97706" />
      <ellipse cx="205" cy="148" rx="14" ry="4.5" fill="#92400e" />
      <path d="M198 138 Q202 128 198 118" stroke="#d1d5db" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M206 135 Q210 124 206 113" stroke="#d1d5db" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite" />
      </path>
      <rect x="200" y="75" width="8" height="35" rx="2" fill="#f43f5e" />
      <path d="M200 108 L204 116 L208 108" fill="#f43f5e" />
    </svg>
  );
}

function IllustrationRocket() {
  return (
    <svg viewBox="0 0 280 280" className="w-full h-full" fill="none">
      <defs>
        <radialGradient id="rocket-body" cx="35%" cy="25%" r="65%">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="40%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="rocket-window" cx="35%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#0369a1" />
        </radialGradient>
        <radialGradient id="flame-grad" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="planet-grad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
      </defs>
      <circle cx="52" cy="210" r="38" fill="url(#planet-grad)" opacity="0.7" />
      <ellipse cx="52" cy="210" rx="55" ry="10" stroke="#a78bfa" strokeWidth="2" fill="none" opacity="0.6" />
      <circle cx="240" cy="55" r="2.5" fill="white" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="55" cy="80" r="2" fill="white" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.1;0.6" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="220" cy="160" r="1.5" fill="white" opacity="0.7">
        <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <g>
        <ellipse cx="140" cy="210" rx="18" ry="32" fill="url(#flame-grad)">
          <animate attributeName="ry" values="32;38;30;36;32" dur="0.4s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="140" cy="208" rx="10" ry="20" fill="#fef08a" opacity="0.8">
          <animate attributeName="ry" values="20;24;18;22;20" dur="0.35s" repeatCount="indefinite" />
        </ellipse>
        <path d="M112 175 L92 210 L122 198 Z" fill="#1d4ed8" />
        <path d="M168 175 L188 210 L158 198 Z" fill="#1d4ed8" />
        <path d="M115 175 L115 120 Q115 60 140 42 Q165 60 165 120 L165 175 Z" fill="url(#rocket-body)" />
        <circle cx="140" cy="130" r="18" fill="url(#rocket-window)" />
        <circle cx="140" cy="130" r="18" stroke="#93c5fd" strokeWidth="2" fill="none" />
        <ellipse cx="134" cy="124" rx="6" ry="4" fill="white" opacity="0.4" transform="rotate(-20 134 124)" />
        <animateTransform attributeName="transform" attributeType="XML" type="translate" values="0,0; 0,-10; 0,0" dur="3s" repeatCount="indefinite" additive="sum" />
      </g>
    </svg>
  );
}

// ─── DATOS ───────────────────────────────────────────────────────────────────

const personalPanels = [
  {
    id: 1,
    title: 'Hola, soy CescJavier7.',
    description: 'Soy un Informático apasionado por el desarrollo de software con enfoque en ciberseguridad. Construyo aplicaciones modernas priorizando la seguridad desde el diseño, aplicando buenas prácticas como validación de entradas, autenticación robusta y protección contra vulnerabilidades.',
    icon: BrainCircuit,
    Illustration: IllustrationBrain,
  },
  {
    id: 2,
    title: 'Disciplina y mérito académico.',
    description: 'Fui beneficiario de una beca al mérito académico en la Universidad Central del Ecuador, resultado de constancia y alto rendimiento. Mantengo un enfoque de mejora continua en programación, matemáticas y seguridad informática.',
    icon: Award,
    Illustration: IllustrationTrophy,
  },
  {
    id: 3,
    title: 'Más allá del código.',
    description: 'Me apasiona estudiar matemáticas, ciencias y filosofía para entender los principios que rigen los sistemas y el mundo, confieso que me apasiona mucho leer. Esta mentalidad analítica la aplico al desarrollo y la ciberseguridad, donde no solo construyo soluciones, sino que busco comprenderlas a profundidad y anticipar sus fallos. También disfruto resolver retos prácticos.',
    icon: BookOpen,
    Illustration: IllustrationBook,
  },
  {
    id: 4,
    title: 'Construir con propósito.',
    description: 'Mi objetivo es desarrollar herramientas y plataformas que integren desarrollo y ciberseguridad, ayudando a otros a crear software más seguro desde el inicio.',
    icon: Target,
    Illustration: IllustrationRocket,
  }
];

// ─── COMPONENTE PRINCIPAL (Reescrito con Estado Activo) ──────────────────────

export default function AboutAppleScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // MAGIA AQUI: En lugar de matemáticas complejas, le decimos qué panel mostrar 
  // basándonos en qué parte del scroll estamos. Es 100% exacto siempre.
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.25) setActiveIndex(0);
    else if (latest < 0.50) setActiveIndex(1);
    else if (latest < 0.75) setActiveIndex(2);
    else setActiveIndex(3); // ¡Si el scroll llega a 1.0, el panel 4 DEBE aparecer!
  });

  return (
    <section
      ref={containerRef}
      className="relative h-[400vh] bg-white dark:bg-black transition-colors duration-500"
      id="sobre-mi"
    >
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto w-full px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* LADO IZQUIERDO: TEXTOS */}
          <div className="relative h-[60vh] flex items-center">
            {personalPanels.map((panel, i) => {
              const isActive = activeIndex === i;
              
              return (
                <motion.div
                  key={`txt-${panel.id}`}
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    // Si el panel ya pasó, sube (-40). Si aún no llega, baja (40). Si está activo, centro (0).
                    y: isActive ? 0 : (activeIndex > i ? -40 : 40),
                    // Detalle Apple: desenfoca sutilmente los que no están activos
                    filter: isActive ? 'blur(0px)' : 'blur(4px)',
                  }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 flex flex-col justify-center pr-10 pointer-events-none"
                  style={{ zIndex: isActive ? 10 : 0, pointerEvents: isActive ? 'auto' : 'none' }}
                >
                  <div className="p-2 w-fit rounded-xl bg-apple-blue/10 mb-4 border border-apple-blue/20">
                    <panel.icon className="w-6 h-6 text-apple-blue" />
                  </div>
                  <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 leading-tight text-zinc-900 dark:text-white">
                    {panel.title}
                  </h2>
                  <p className="text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                    {panel.description}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* LADO DERECHO: ILUSTRACIONES SVG */}
          <div className="relative aspect-square w-full max-w-md mx-auto rounded-[3rem] overflow-hidden
                          bg-zinc-50 dark:bg-zinc-900
                          border border-zinc-200 dark:border-white/10
                          shadow-2xl shadow-zinc-200/60 dark:shadow-black/40">
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
                  className="absolute inset-0 w-full h-full flex items-center justify-center p-8"
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