'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Code2, Database, Network, Server, GraduationCap, Briefcase } from 'lucide-react';

// ─── TUS DATOS EXACTOS (Limpios de avatares) ─────────────────────────────────
const experiencesData = [
  {
    id: 1,
    title: 'Desarrollador de Sistemas e Infraestructura IT',
    company: 'Independiente',
    period: 'Ene 2024 - Actualidad',
    description: 'Desarrollo web integral y soluciones ecommerce. Optimización de bases de datos SQL (mejora del 40% en consultas) y creación de bots de trading automatizados con análisis técnico de baja latencia.',
    icon: Code2, 
  },
  {
    id: 2,
    title: 'Data Engineer & Support Specialist',
    company: 'UCE',
    period: 'Ene 2023 - Dic 2023',
    description: 'Administración de bases de datos y gobernanza de datos (RBAC, cifrado). Gestión de incidentes bajo SLAs y soporte a infraestructura crítica (DMS/LMS/ERP) con protocolos de Disaster Recovery.',
    icon: Database, 
  },
  {
    id: 3,
    title: 'Proyecto de Competencias Digitales',
    company: 'Fajardo - Sangolquí',
    period: 'Sep 2022 - Dic 2022',
    description: 'Implementación de red Wi-Fi pública comunitaria con segmentación de tráfico segura. Liderazgo en talleres de alfabetización digital y productividad aplicada para la comunidad.',
    icon: Network, 
  },
  {
    id: 4,
    title: 'Profesor de Informática y Matemáticas',
    company: 'Unidad Educativa 13 de Abril',
    period: 'Sep 2021 - Ago 2022',
    description: 'Instrucción en algoritmos, lógica de programación y desarrollo web (Python, PHP, JavaScript). Supervisión de proyectos técnicos estudiantiles orientados a la resolución de problemas.',
    icon: Server, 
  },
  {
    id: 5,
    title: 'Docente de Matemáticas (Proyecto Transformar)',
    company: 'UCE',
    period: 'Mar 2022 - Ago 2022',
    description: 'Capacitación intensiva en razonamiento numérico y abstracto para ingreso a la educación superior. Diseño de estrategias pedagógicas para asegurar el éxito académico de los aspirantes.',
    icon: GraduationCap, 
  },
  {
    id: 6,
    title: 'Docente Matemáticas',
    company: 'Universidad Central del Ecuador',
    period: 'Oct 2020 - Jun 2021',
    description: 'Cátedra de cálculo integral y diferencial en entornos virtuales. Uso de herramientas de visualización matemática (GeoGebra, Python) y administración de contenidos en plataformas LMS.',
    icon: Briefcase, 
  }
];

export default function WorkExperienceApple() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    // Ya no necesitamos h-[400vh], ahora fluye natural con la página
    <section id="experiencia" className="py-24 bg-white dark:bg-black transition-colors duration-500">
      
      {/* max-w-4xl hace que el texto no se estire demasiado de lado a lado en PC */}
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        
        {/* Cabecera */}
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-zinc-900 dark:text-white">
            Experiencia Laboral.
          </h2>
        </div>
        
        {/* LA CAJA APPLE (Gris Premium) */}
        <div className="bg-[#f5f5f7] dark:bg-[#1d1d1f] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 transition-colors duration-500">
          <div className="flex flex-col">
            
            {experiencesData.map((exp, index) => {
              const isActive = activeIndex === index;

              return (
                <div key={exp.id} className="border-b border-zinc-200 dark:border-zinc-700/50 last:border-none">
                  
                  {/* Botón del Acordeón */}
                  <button
                    // Si tocas el que ya está abierto, lo cierra. Si tocas otro, lo abre.
                    onClick={() => setActiveIndex(isActive ? -1 : index)}
                    className="w-full flex items-center justify-between py-6 text-left focus:outline-none group"
                  >
                    <h3 className={`text-lg md:text-2xl font-semibold tracking-tight transition-colors duration-300 pr-4 ${
                      isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-zinc-300'
                    }`}>
                      {exp.title}
                    </h3>
                    
                    {/* Flecha dinámica */}
                    <motion.div
                      animate={{ rotate: isActive ? 180 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="shrink-0"
                    >
                      <ChevronDown className={`w-5 h-5 md:w-6 md:h-6 transition-colors ${isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`} />
                    </motion.div>
                  </button>

                  {/* Contenido que se despliega */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-8 pt-2 md:pr-12">
                          {/* Datos de Empresa y Fecha + Icono */}
                          <div className="flex items-center gap-2 mb-3">
                            <exp.icon className="w-4 h-4 text-apple-blue shrink-0" />
                            <p className="text-xs md:text-sm font-semibold text-apple-blue uppercase tracking-wide">
                              {exp.company} • {exp.period}
                            </p>
                          </div>
                          
                          {/* Descripción */}
                          <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed text-balance">
                            {exp.description}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                </div>
              );
            })}

          </div>
        </div>

      </div>
    </section>
  );
}