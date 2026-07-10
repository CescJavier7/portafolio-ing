'use client';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Trophy, 
  Award, 
  Brain, 
  Globe, 
  Lock, 
  Code, 
  BookOpen, 
  Cpu, 
  CheckCircle,
  Network
} from 'lucide-react';

// ─── DATOS DE CERTIFICACIONES CON IMÁGENES ───────────────────────────────────
const certs = [
  {
    title: 'Cisco Cyber Games Americas 2026',
    issuer: 'Cisco Networking Academy',
    date: 'Junio 2026',
    description: 'Participación en el Desafío Capture The Flag Cisco Cyber Games Américas 2026 de Cisco Networking Academy, una competencia de 3 horas entre estudiantes del Continente Americano sobre el curso de Hacker Ético[cite: 1].',
    icon: Trophy,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    image: '/cisco-ctf.jpg'
  },
  {
    title: 'Ciberseguridad y Hacking Ético',
    issuer: 'BIG school',
    date: 'Abril 2026',
    description: 'Certificado de asistencia a las jornadas sobre técnicas de detección de vulnerabilidades y defensa digital con una duración de 6 horas[cite: 1].',
    icon: ShieldCheck,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    image: '/hacking-etico-big.jpg'
  },
  {
    title: 'English Certificate (A1, A2, B1)',
    issuer: 'Instituto Superior Tecnológico Portoviejo (ITSUP)',
    date: '2025 - Mayo 2026',
    description: 'Aprobación de los niveles de suficiencia A1, A2 y B1 de acuerdo con el Marco Común Europeo de Referencia[cite: 1].',
    icon: Globe,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    image: '/english-certificates.jpg'
  },
  {
    title: '10,000 Prompters: Ingeniería de Prompts para IA',
    issuer: 'Dubai Future Foundation & Gobierno del Ecuador',
    date: '2026',
    description: 'Programa impulsado por el Gobierno del Ecuador en alianza con los Emiratos Árabes Unidos para fortalecer competencias en ingeniería de prompts para sistemas de inteligencia artificial[cite: 1].',
    icon: Brain,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    image: '/prompts-ia.jpg'
  },
  {
    title: 'Ethical Hacker (Verified Badge)',
    issuer: 'Cisco Networking Academy',
    date: '2026',
    description: 'Credencial verificada que avala las competencias y conocimientos técnicos en metodologías de Hacking Ético[cite: 1].',
    icon: Network,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    image: '/cisco-ethical-hacker.jpg'
  },
  {
    title: 'Comprendiendo el Cerebro para Transformar el Aprendizaje',
    issuer: 'PUCE Virtual',
    date: 'Octubre 2025',
    description: 'Webinar organizado por la Coordinación de la Maestría Virtual en Educación con mención en Neurociencias aplicadas a la educación[cite: 1].',
    icon: BookOpen,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    image: '/neurociencias-puce.jpg'
  },
  {
    title: 'Iniciación al Desarrollo con IA',
    issuer: 'BIG school',
    date: 'Octubre 2025',
    description: 'Certificado de asistencia a las jornadas formativas de Desarrollo con IA, con una duración de 6 horas[cite: 1].',
    icon: Code,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    image: '/desarrollo-ia-big.jpg'
  },
  {
    title: 'Ley de Protección de Datos Personales',
    issuer: 'Academia ProGenios',
    date: 'Junio 2025',
    description: 'Curso gratuito de 6 horas de capacitación, habiendo aprobado la evaluación de conocimientos sobre la normativa y cumplimiento de privacidad[cite: 1].',
    icon: Lock,
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    image: '/proteccion-datos.jpg'
  },
  {
    title: 'Introducción a Ciberseguridad',
    issuer: 'Fundación Telefónica Movistar',
    date: 'Marzo 2025',
    description: 'Certificado de superación que acredita la culminación del curso de 20 horas en fundamentos de ciberseguridad[cite: 1].',
    icon: Cpu,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    image: '/intro-ciberseguridad-telefonica.jpg'
  },
  {
    title: 'Introduction to Cybersecurity (Verified Badge)',
    issuer: 'Cisco Networking Academy',
    date: '2025',
    description: 'Credencial verificada que demuestra los conocimientos fundamentales sobre el panorama de amenazas y principios básicos de defensa digital[cite: 1].',
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    image: '/cisco-intro-cyber.jpg'
  },
  {
    title: 'Aprendizaje Basado en Proyectos',
    issuer: 'Ubicua (Conecta Empleo)',
    date: 'Enero 2024',
    description: 'Certificado del programa de formación digital enfocado en metodologías activas y aprendizaje práctico[cite: 1].',
    icon: Award,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    image: '/ubicua-abp.jpg'
  }
];

export default function CertificationsApple() {
  return (
    <section className="py-24 bg-white dark:bg-black transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-blue-500 font-bold tracking-tight mb-3 uppercase text-xs italic">Validación Técnica y Académica</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 text-zinc-900 dark:text-white">
            Certificaciones y Logros.
          </h2>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl text-balance">
            Evidencia formal de mi trayectoria continua y competencias multidisciplinarias en ciberseguridad, infraestructura tecnológica, desarrollo con inteligencia artificial y ciencias de la educación.
          </p>
        </motion.div>

        {/* He ampliado a grid-cols-4 en pantallas muy grandes para acomodar mejor las 12 tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          {certs.map((cert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative group rounded-[2rem] bg-[#f5f5f7] dark:bg-[#111111] border border-zinc-200 dark:border-white/5 overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl transition-all duration-500"
            >
              {/* CONTENEDOR DE LA IMAGEN */}
              <div className="relative w-full aspect-video overflow-hidden bg-zinc-200 dark:bg-zinc-800 border-b border-zinc-200 dark:border-white/5">
                <img 
                  src={cert.image} 
                  alt={`Certificado de ${cert.title}`} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48L3N2Zz4=';
                  }}
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className={`absolute bottom-3 left-3 w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-md bg-white/10 ${cert.border} border shadow-lg translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500`}>
                  <cert.icon className={`w-5 h-5 ${cert.color}`} />
                </div>
              </div>

              {/* CONTENEDOR DE TEXTO */}
              <div className="p-6 flex-grow flex flex-col relative z-10">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 tracking-tight leading-snug line-clamp-2">
                  {cert.title}
                </h3>
                
                <div className="flex flex-col gap-1 mb-4">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{cert.issuer}</span>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-200 dark:bg-zinc-800 w-fit px-2 py-0.5 rounded-full">{cert.date}</span>
                </div>
                
                <p className="text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed mt-auto line-clamp-4">
                  {cert.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}