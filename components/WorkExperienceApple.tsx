'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Code2, Database, Network, Server, GraduationCap, Briefcase, Calendar, Building2 } from 'lucide-react';

// ─── DATOS ENRIQUECIDOS (Con Tech Tags) ──────────────────────────────────────
const experiencesData = [
  {
    id: 1,
    title: 'Desarrollador de Sistemas e Infraestructura IT',
    company: 'Independiente',
    period: 'Ene 2024 - Actualidad',
    description: 'Desarrollo web integral y soluciones ecommerce. Optimización de bases de datos SQL (mejora del 40% en consultas) y creación de bots de trading automatizados con análisis técnico de baja latencia.',
    icon: Code2, 
    tags: ['SQL', 'Trading Bots', 'Low Latency', 'E-commerce', 'Fullstack']
  },
  {
    id: 2,
    title: 'Data Engineer & Support Specialist',
    company: 'Universidad Central del Ecuador',
    period: 'Ene 2023 - Dic 2023',
    description: 'Administración de bases de datos y gobernanza de datos (RBAC, cifrado). Gestión de incidentes bajo SLAs y soporte a infraestructura crítica (DMS/LMS/ERP) con protocolos de Disaster Recovery.',
    icon: Database, 
    tags: ['Data Governance', 'Disaster Recovery', 'RBAC', 'SLA', 'ERP']
  },
  {
    id: 3,
    title: 'Proyecto de Competencias Digitales',
    company: 'Fajardo - Sangolquí',
    period: 'Sep 2022 - Dic 2022',
    description: 'Implementación de red Wi-Fi pública comunitaria con segmentación de tráfico segura. Liderazgo en talleres de alfabetización digital y productividad aplicada para la comunidad.',
    icon: Network, 
    tags: ['Redes Seguras', 'Wi-Fi', 'Liderazgo', 'Alfabetización Digital']
  },
  {
    id: 4,
    title: 'Profesor de Informática y Matemáticas',
    company: 'Unidad Educativa 13 de Abril',
    period: 'Sep 2021 - Ago 2022',
    description: 'Instrucción en algoritmos, lógica de programación y desarrollo web (Python, PHP, JavaScript). Supervisión de proyectos técnicos estudiantiles orientados a la resolución de problemas.',
    icon: Server, 
    tags: ['Python', 'PHP', 'JavaScript', 'Lógica de Programación', 'Docencia']
  },
  {
    id: 5,
    title: 'Docente de Matemáticas (Proyecto Transformar)',
    company: 'Universidad Central del Ecuador',
    period: 'Mar 2022 - Ago 2022',
    description: 'Capacitación intensiva en razonamiento numérico y abstracto para ingreso a la educación superior. Diseño de estrategias pedagógicas para asegurar el éxito académico de los aspirantes.',
    icon: GraduationCap, 
    tags: ['Matemáticas', 'Razonamiento Abstracto', 'Pedagogía', 'Estrategia']
  },
  {
    id: 6,
    title: 'Docente Matemáticas',
    company: 'Universidad Central del Ecuador',
    period: 'Oct 2020 - Jun 2021',
    description: 'Cátedra de cálculo integral y diferencial en entornos virtuales. Uso de herramientas de visualización matemática (GeoGebra, Python) y administración de contenidos en plataformas LMS.',
    icon: Briefcase, 
    tags: ['Cálculo Integral', 'GeoGebra', 'Python', 'LMS']
  }
];

export default function WorkExperienceApple() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <section id="experiencia" className="py-24 bg-zinc-50 dark:bg-black transition-colors duration-500 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        
        {/* Cabecera Animada */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 md:mb-24"
        >
          <p className="text-blue-500 font-bold tracking-tight mb-3 uppercase text-xs italic">Trayectoria Profesional</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-zinc-900 dark:text-white mb-4">
            Experiencia Laboral.
          </h2>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl text-balance">
            Un historial de resolución de problemas complejos, liderazgo técnico y transferencia de conocimiento.
          </p>
        </motion.div>
        
        {/* CONTENEDOR TIMELINE */}
        <div className="relative">
          
          {/* Línea vertical de fondo */}
          <div className="absolute left-[19px] md:left-[27px] top-8 bottom-8 w-[2px] bg-gradient-to-b from-blue-500/50 via-zinc-200 dark:via-zinc-800 to-transparent" />

          <div className="flex flex-col gap-6 md:gap-8">
            {experiencesData.map((exp, index) => {
              const isActive = activeIndex === index;

              return (
                <div key={exp.id} className="flex gap-4 md:gap-8 relative z-10">
                  
                  {/* Columna del Nodo (Punto en la línea) */}
                  <div className="flex flex-col items-center pt-8 shrink-0">
                    <motion.div
                      className="w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-zinc-50 dark:border-black z-10 relative"
                      animate={{
                        backgroundColor: isActive ? '#3b82f6' : '#71717a', // Azul si está activo, gris si no
                        scale: isActive ? 1.3 : 1,
                        boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.6)' : '0 0 0px rgba(0,0,0,0)'
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>

                  {/* Columna de la Tarjeta Interactiva */}
                  <motion.div
                    layout
                    onClick={() => setActiveIndex(isActive ? null : index)}
                    whileHover={{ scale: 0.99 }}
                    className={`flex-1 cursor-pointer overflow-hidden rounded-[2rem] border transition-all duration-500 ${
                      isActive 
                        ? 'bg-white dark:bg-zinc-900/80 border-blue-500/30 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.15)]' 
                        : 'bg-white/50 dark:bg-zinc-900/30 border-zinc-200 dark:border-white/5 hover:bg-white dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="p-6 md:p-8">
                      
                      {/* Fila Superior: Título e Icono */}
                      <motion.div layout className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl transition-colors duration-500 ${isActive ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                            <exp.icon size={22} />
                          </div>
                          <h3 className={`text-xl md:text-2xl font-bold tracking-tight transition-colors duration-500 ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {exp.title}
                          </h3>
                        </div>
                        <motion.div
                          animate={{ rotate: isActive ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-1"
                        >
                          <ChevronDown size={16} className={isActive ? 'text-blue-500' : 'text-zinc-500'} />
                        </motion.div>
                      </motion.div>

                      {/* Subtítulo: Empresa y Fecha (Siempre visible) */}
                      <motion.div layout className="flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
                        <span className="flex items-center gap-1.5"><Building2 size={16}/> {exp.company}</span>
                        <span className="hidden md:block w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <span className="flex items-center gap-1.5"><Calendar size={16}/> {exp.period}</span>
                      </motion.div>

                      {/* Contenido Expansible (Animación Framer Motion) */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed mb-6 text-balance">
                                {exp.description}
                              </p>
                              
                              {/* Tech Tags / Badges */}
                              <div className="flex flex-wrap gap-2">
                                {exp.tags.map(tag => (
                                  <span 
                                    key={tag} 
                                    className="px-3 py-1 text-xs md:text-sm font-medium rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}