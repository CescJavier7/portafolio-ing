"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Shield, GraduationCap, MousePointerClick, X } from 'lucide-react';

interface AcademicProps {
  lang: string;
  dict?: any; 
}

// Diccionario exacto basado en la captura y su traducción al inglés
const defaultDict = {
  es: {
    sectionTitle: "Background Académico",
    sectionSubtitle: "Formación universitaria sustentada en ciencias exactas, ingeniería informática y ciberseguridad aplicada.",
    clickHint: "Toca para ver currículum",
    closeHint: "Cerrar",
    degrees: [
      {
        title: "Ingeniería en Ciberseguridad y Gestión de Tecnologías de la Información",
        institution: "Pontificia Universidad Católica del Ecuador",
        date: "Actualidad",
        type: "INGENIERÍA - ESPECIALIZACIÓN",
        icon: 'shield',
        description: "Formación en ciencias de la computación, ingeniería de software y ciberseguridad, con fundamentos matemáticos en Cálculo, Álgebra Lineal, Matemáticas Discretas, Métodos Numéricos y Estadística Aplicada. Especialización en criptografía, arquitectura de sistemas, redes, ethical hacking, análisis forense digital, gestión de riesgos, seguridad en la nube y diseño de infraestructuras Zero Trust."
      },
      {
        title: "Licenciatura en Informática",
        institution: "Universidad Central del Ecuador",
        date: "Completado",
        type: "TÍTULO UNIVERSITARIO",
        icon: 'book',
        description: "Programa originado en la Escuela de Ciencias Exactas con una sólida base en ciencias computacionales, pensamiento algorítmico, programación, bases de datos, arquitectura de computadores, investigación científica y tecnologías educativas. Complementado con fundamentos pedagógicos para el diseño, transferencia y comunicación efectiva del conocimiento tecnológico."
      }
    ]
  },
  en: {
    sectionTitle: "Academic Background",
    sectionSubtitle: "University education based on exact sciences, computer engineering, and applied cybersecurity.",
    clickHint: "Tap to view curriculum",
    closeHint: "Close",
    degrees: [
      {
        title: "B.S. Cybersecurity & IT Management",
        institution: "Pontificia Universidad Católica del Ecuador",
        date: "Present",
        type: "ENGINEERING - SPECIALIZATION",
        icon: 'shield',
        description: "Education in computer science, software engineering, and cybersecurity, with mathematical foundations in Calculus, Linear Algebra, Discrete Mathematics, Numerical Methods, and Applied Statistics. Specialization in cryptography, systems architecture, networking, ethical hacking, digital forensics, risk management, cloud security, and Zero Trust infrastructure design."
      },
      {
        title: "B.A. Informatics",
        institution: "Universidad Central del Ecuador", 
        date: "Completed",
        type: "UNIVERSITY DEGREE",
        icon: 'book',
        description: "Program originated in the School of Exact Sciences with a solid foundation in computer science, algorithmic thinking, programming, databases, computer architecture, scientific research, and educational technologies. Complemented with pedagogical foundations for the design, transfer, and effective communication of technological knowledge."
      }
    ]
  }
};

// Subcomponente aislado para manejar el estado 3D de cada tarjeta independientemente
const DegreeCard = ({ degree, t, index }: { degree: any, t: any, index: number }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const IconComponent = degree.icon === 'shield' ? Shield : BookOpen;
  const isEngineering = degree.icon === 'shield';

  return (
    <div
      className="relative w-full h-[420px] sm:h-[380px] group cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
      // Safari necesita el prefijo -webkit- para perspective; sin él el flip
      // no tiene profundidad 3D y las caras se ven planas/espejadas.
      style={{ perspective: '1000px', WebkitPerspective: '1000px' }}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: 'preserve-3d', WebkitTransformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.7, type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* ================= FRENTE DE LA TARJETA ================= */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50 p-8 md:p-10 flex flex-col shadow-sm hover:shadow-xl dark:hover:bg-zinc-900/80 transition-all duration-300"
          // -webkit-backface-visibility: SIN esto Safari no oculta la cara
          // trasera y el frente se transparenta espejado (bug reportado).
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          
          {/* Marca de agua (Icono gigante de fondo) */}
          <div className="absolute top-6 right-6 opacity-5 dark:opacity-10 transition-opacity">
            <IconComponent className={`w-32 h-32 ${isEngineering ? 'text-green-600 dark:text-green-500' : 'text-blue-600 dark:text-blue-500'}`} strokeWidth={1} />
          </div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="mb-6">
              <span className={`inline-block py-1.5 px-4 rounded-full text-[11px] font-bold tracking-wider border uppercase ${
                isEngineering 
                  ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
                  : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
              }`}>
                {degree.type}
              </span>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-zinc-100 mb-6 leading-tight tracking-tight pr-8">
              {degree.title}
            </h3>
            
            <div className="mt-auto">
              <p className="text-zinc-600 dark:text-zinc-400 font-medium flex items-start gap-2 text-sm mb-6">
                <GraduationCap className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" /> 
                <span>
                  {degree.institution} • <span className={isEngineering ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>{degree.date}</span>
                </span>
              </p>

              {/* Indicador de interacción */}
              <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-widest group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">
                <MousePointerClick className="w-4 h-4 animate-bounce" />
                {t.clickHint}
              </div>
            </div>
          </div>
        </div>

        {/* ================= DORSO DE LA TARJETA ================= */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-8 md:p-10 flex flex-col shadow-inner"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            WebkitTransform: 'rotateY(180deg)',
          }}
        >
          <div className="relative z-10 flex flex-col h-full justify-between">
            
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold tracking-widest uppercase text-zinc-400">
                Detalles del Programa
              </span>
              <button className="p-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 pr-2">
              <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed font-medium">
                {degree.description}
              </p>
            </div>
            
          </div>
          
          {/* Acento visual inferior en el dorso */}
          <div className={`absolute bottom-0 left-0 w-full h-1 ${isEngineering ? 'bg-green-500' : 'bg-blue-500'}`} />
        </div>

      </motion.div>
    </div>
  );
};

export default function AcademicBento({ lang = 'es', dict }: AcademicProps) {
  const t = dict || defaultDict[lang as 'es' | 'en'];

  return (
    <section className="w-full py-24 px-4 flex justify-center items-center bg-zinc-50 dark:bg-[#020617] transition-colors duration-300 font-sans selection:bg-green-500/30">
      <div className="max-w-5xl w-full">
        
        {/* Cabecera */}
        <div className="mb-12 md:mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-4 transition-colors"
          >
            {t.sectionTitle}<span className="text-green-500">.</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-zinc-600 dark:text-zinc-400 text-base md:text-lg max-w-2xl transition-colors font-medium leading-relaxed"
          >
            {t.sectionSubtitle}
          </motion.p>
        </div>

        {/* Bento Grid - 2 Columnas con Flip Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {t.degrees.map((degree: any, index: number) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
            >
              <DegreeCard degree={degree} t={t} index={index} />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}