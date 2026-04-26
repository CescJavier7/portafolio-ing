'use client';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, Server, Terminal, Code2, 
  Database, Cpu, Layers, Globe, GraduationCap, 
  Palette, Users, Sparkles
} from 'lucide-react';
import { 
  SiReact, SiNodedotjs, SiKalilinux, SiPython, 
  SiDocker, SiMysql, SiMongodb, SiCplusplus, SiLinux
} from 'react-icons/si';

// ─── ÍCONOS PERSONALIZADOS (A prueba de fallos de Vercel) ──────────────

function CustomArduinoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.5,8 C14.5,8 13.2,9.6 12,11.2 C10.8,9.6 9.5,8 7.5,8 C4.5,8 2,10.2 2,13 C2,15.8 4.5,18 7.5,18 C9.5,18 10.8,16.4 12,14.8 C13.2,16.4 14.5,18 16.5,18 C19.5,18 22,15.8 22,13 C22,10.2 19.5,8 16.5,8 Z M7.5,16.5 C5.6,16.5 4,14.9 4,13 C4,11.1 5.6,9.5 7.5,9.5 C9.4,9.5 10.8,11.2 11.5,12.2 C10.8,13.8 9.4,16.5 7.5,16.5 Z M16.5,16.5 C14.6,16.5 13.2,13.8 12.5,12.2 C13.2,11.2 14.6,9.5 16.5,9.5 C18.4,9.5 20,11.1 20,13 C20,14.9 18.4,16.5 16.5,16.5 Z"/>
      <path d="M5.5 12.5h4v1h-4z" />
      <path d="M14.5 12.5h4v1h-4zM16 11h1v4h-1z" />
    </svg>
  );
}

function CustomAdobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M14.43 2.11L22.95 22H16.8l-2.07-5.32H8.85L14.43 2.11zM9.5 2.11L1 22h6.18L9.5 2.11z"/>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────

export default function SkillsApple() {
  return (
    <section id="habilidades" className="py-24 bg-white dark:bg-black transition-colors duration-500 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        
        {/* Cabecera Estilo Apple */}
        <motion.div 
          className="mb-20 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-apple-blue font-bold tracking-tight mb-3 uppercase text-xs italic">Stack Tecnológico & Skills</p>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-zinc-900 dark:text-white">
            Ingeniería de raíz. <br /> <span className="text-zinc-400">Perfil Multidisciplinario.</span>
          </h2>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed text-balance">
            Desde la gestión de memoria en C++ y ciberseguridad, hasta la automatización con IA y la pedagogía STEM. Un perfil diseñado para la robustez técnica y el impacto humano.
          </p>
        </motion.div>

        {/* BENTO GRID EVOLUCIONADO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,_auto)]">

          {/* 1. CORE TECHNOLOGIES & FRONTEND (Ancho: 2 col) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-[#f5f5f7] dark:bg-[#1d1d1f] p-10 group border border-zinc-200 dark:border-white/5"
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex gap-4 mb-6">
                  <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm">
                    <SiReact className="w-6 h-6 text-blue-500" />
                  </div>
                  <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-center shadow-sm">
                    <Globe className="w-6 h-6 text-orange-500" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">Core & Frontend</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-md">
                  Dominio de los fundamentos: HTML5, CSS3 y JS moderno, React 19 y Next.js para interfaces críticas.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-8">
                {['Next.js 15', 'TypeScript', 'Tailwind v4', 'Framer Motion'].map(t => (
                  <span key={t} className="px-4 py-2 text-[10px] font-bold uppercase rounded-full bg-white dark:bg-black/30 border border-zinc-200 dark:border-white/10">{t}</span>
                ))}
              </div>
            </div>
            <SiReact className="absolute -bottom-10 -right-10 w-64 h-64 text-zinc-200 dark:text-zinc-800/20 opacity-30 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />
          </motion.div>

          {/* 2. PENTESTING (Alto: 2 filas) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="md:row-span-2 relative overflow-hidden rounded-[3rem] bg-zinc-950 p-10 group border border-white/5"
          >
            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700" 
                 style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(74,222,128,0.1)]">
                  <SiKalilinux className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-white mb-4">Ciberseguridad Ofensiva</h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-6">
                  Auditoría web, escaneo de vulnerabilidades y explotación controlada bajo metodologías profesionales.
                </p>
                <ul className="space-y-3">
                  {['Metasploit', 'Burp Suite', 'Nmap', 'Wireshark'].map(tool => (
                    <li key={tool} className="flex items-center gap-2 text-sm text-green-400/80 font-mono">
                      <Terminal size={14} /> {tool}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* 3. DATA ARCHITECTURE (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-white dark:bg-[#1d1d1f] p-8 border border-zinc-100 dark:border-white/5 shadow-sm"
          >
            <Database className="w-10 h-10 text-apple-blue mb-6" />
            <h3 className="text-2xl font-bold mb-3">Data Architecture</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
              Diseño de esquemas eficientes y optimización de queries para alta concurrencia.
            </p>
            <div className="flex gap-4">
              <SiMysql className="w-8 h-8 text-zinc-400" />
              <SiNodedotjs className="w-8 h-8 text-zinc-400" />
              <SiMongodb className="w-8 h-8 text-zinc-400" />
            </div>
          </motion.div>

          {/* 4. ENGINE ROOM / DEVOPS (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-zinc-900 p-8 text-white group"
          >
            <div className="flex justify-between items-start mb-6">
              <Cpu className="w-10 h-10 text-zinc-400 group-hover:text-white transition-colors" />
              <SiLinux className="w-6 h-6 text-zinc-600" />
            </div>
            <h3 className="text-2xl font-bold mb-3">The Engine Room</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Dockerización, gestión de servidores Linux y versionamiento avanzado con Git.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 text-[9px] bg-white/10 rounded-md font-mono">DOCKER</span>
              <span className="px-2 py-1 text-[9px] bg-white/10 rounded-md font-mono">BASH</span>
              <span className="px-2 py-1 text-[9px] bg-white/10 rounded-md font-mono">SSH</span>
            </div>
          </motion.div>

          {/* 5. SCRIPTS & AUTOMATION (Ancho: 2 col) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 rounded-[3rem] bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-[#111] dark:to-[#1d1d1f] p-10 flex flex-col md:flex-row gap-10 items-center border border-zinc-200 dark:border-white/5"
          >
            <div className="md:w-1/2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-yellow-400/10 rounded-2xl flex items-center justify-center">
                  <SiPython className="w-6 h-6 text-yellow-500" />
                </div>
                <h3 className="text-2xl font-bold">Scripts & Automation</h3>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Python como puente entre el desarrollo y el hacking. Automatización de tareas, Web Scraping y creación de herramientas de seguridad personalizadas.
              </p>
            </div>
            <div className="md:w-1/2 grid grid-cols-2 gap-4 w-full">
              <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-zinc-200 dark:border-white/5">
                <p className="text-[10px] font-bold text-zinc-400 mb-1">SCRAPING</p>
                <p className="text-sm font-semibold">BeautifulSoup</p>
              </div>
              <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-zinc-200 dark:border-white/5">
                <p className="text-[10px] font-bold text-zinc-400 mb-1">AUTOMATION</p>
                <p className="text-sm font-semibold">Selenium</p>
              </div>
            </div>
          </motion.div>

          {/* 6. SOFTWARE ENGINEERING (Bajo nivel / C++) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-apple-blue p-8 text-white relative overflow-hidden"
          >
            <Layers className="w-10 h-10 mb-6 opacity-30" />
            <h3 className="text-2xl font-bold mb-3">Software Engineering</h3>
            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Comprensión profunda de estructuras de datos, gestión de memoria y patrones de diseño.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg backdrop-blur-sm">
                <SiCplusplus size={14} />
                <span className="text-xs font-bold font-mono">C++</span>
              </div>
              <span className="text-[10px] font-mono opacity-60 italic">Bajo Nivel</span>
            </div>
          </motion.div>

          {/* 7. DOCENCIA STEM & ROBÓTICA (Ancho: 2 col) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 rounded-[3rem] bg-[#f5f5f7] dark:bg-[#1d1d1f] p-10 flex flex-col justify-center border border-zinc-200 dark:border-white/5 relative overflow-hidden"
          >
            <div className="flex gap-4 mb-6 relative z-10">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-blue-500" />
              </div>
              <div className="w-12 h-12 bg-teal-500/10 rounded-2xl flex items-center justify-center">
                {/* AQUI ESTÁ EL NUEVO ÍCONO DE ARDUINO */}
                <CustomArduinoIcon className="w-6 h-6 text-teal-500" />
              </div>
            </div>
            <h3 className="text-3xl font-bold mb-3 z-10 text-zinc-900 dark:text-white">Docencia STEM & Robótica</h3>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg z-10 max-w-xl">
              Formación integral y pedagógica en ciencias exactas (Matemáticas y Física), lógica de programación con Scratch, robótica básica (Arduino) y diseño de material didáctico digital en EducaPlay.
            </p>
          </motion.div>

          {/* 8. DISEÑO VISUAL & ADOBE (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-gradient-to-br from-pink-50 to-purple-50 dark:from-[#2a1525] dark:to-[#1a1025] p-8 border border-pink-100 dark:border-pink-500/20"
          >
            {/* AQUI ESTÁ EL NUEVO ÍCONO DE ADOBE */}
            <CustomAdobeIcon className="w-10 h-10 text-pink-500 mb-6" />
            <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">Especialista Digital</h3>
            <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed mb-6">
              Manejo versátil del paquete de Adobe y herramientas de diseño gráfico para creación de UI, recursos visuales y prototipado básico.
            </p>
          </motion.div>

          {/* 9. HABILIDADES BLANDAS (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-white dark:bg-[#1d1d1f] p-8 border border-zinc-200 dark:border-white/5 shadow-sm"
          >
            <Users className="w-10 h-10 text-emerald-500 mb-6" />
            <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">Soft Skills</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              El lado humano detrás del código. Destaco en la comunicación asertiva, el liderazgo empático, el pensamiento crítico y la resolución analítica de problemas complejos.
            </p>
          </motion.div>

          {/* 10. PROMPT ENGINEERING & IA (Ancho: 2 col) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 rounded-[3rem] bg-zinc-950 p-10 group border border-indigo-500/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity duration-700" 
                 style={{ backgroundImage: 'linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            <div className="relative z-10 flex flex-col h-full justify-center">
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">Prompt Engineering & IA</h3>
              <p className="text-zinc-400 text-lg max-w-xl leading-relaxed">
                Diseño estructurado de prompts para exprimir al máximo los Modelos de Lenguaje (LLMs). Integración de inteligencia artificial para la automatización inteligente de flujos de trabajo en producción.
              </p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}