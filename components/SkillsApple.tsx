'use client';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, Server, Terminal, Database, Cpu, 
  Layers, Globe, LineChart, Users, Sparkles, LayoutTemplate, ShieldCheck
} from 'lucide-react';
import { 
  SiReact, SiNodedotjs, SiKalilinux, SiPython, 
  SiDocker, SiPostgresql, SiMysql, SiCplusplus, SiLinux, SiGrafana
} from 'react-icons/si';

export default function SkillsApple() {
  return (
    <section id="habilidades" className="py-24 bg-white dark:bg-black transition-colors duration-500 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        
        {/* Cabecera Corporativa */}
        <motion.div 
          className="mb-20 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-apple-blue font-bold tracking-tight mb-3 uppercase text-xs italic">Arquitectura & Tecnologías</p>
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-zinc-900 dark:text-white">
            Ingeniería Defensiva. <br /> <span className="text-zinc-400">Software Escalable.</span>
          </h2>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 leading-relaxed text-balance">
            Desarrollo soluciones tecnológicas combinando el rigor del bajo nivel (C++) con la agilidad del desarrollo web moderno, siempre bajo un enfoque de Security by Design.
          </p>
        </motion.div>

        {/* BENTO GRID INGENIERÍA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(300px,_auto)]">

          {/* 1. DEVSECOPS & CIBERSEGURIDAD (Ancho: 2 col) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 relative overflow-hidden rounded-[3rem] bg-zinc-950 p-10 group border border-green-500/10"
          >
            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700" 
                 style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex gap-4 mb-6">
                  <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.1)]">
                    <ShieldCheck className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="w-14 h-14 bg-zinc-900 border border-white/10 rounded-2xl flex items-center justify-center">
                    <SiKalilinux className="w-7 h-7 text-zinc-400" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-white mb-4">Ciberseguridad & DevSecOps</h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-6 max-w-lg">
                  Auditoría de vulnerabilidades, configuración de sistemas NIDS/IPS (Snort, Fail2ban) y análisis forense de tráfico. Integración de prácticas de seguridad preventivas en el ciclo de vida del software.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['Metasploit', 'Nmap', 'Iptables', 'OWASP Top 10'].map(t => (
                    <span key={t} className="px-3 py-1.5 text-xs font-mono rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. INFRAESTRUCTURA & DEVOPS (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="md:row-span-2 rounded-[2.5rem] bg-apple-blue p-8 text-white relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Server className="w-32 h-32" />
            </div>
            <div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                <SiLinux className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Infraestructura & Servidores</h3>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Administración de entornos Linux, virtualización y despliegue de contenedores garantizando alta disponibilidad.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <SiDocker className="w-5 h-5" />
                <span className="text-sm font-semibold">Docker / Compose</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <Terminal className="w-5 h-5" />
                <span className="text-sm font-semibold">Bash Scripting</span>
              </div>
            </div>
          </motion.div>

          {/* 3. SOFTWARE ENGINEERING FRONTEND (Ancho: 2 col) */}
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
                    <Layers className="w-6 h-6 text-zinc-900 dark:text-white" />
                  </div>
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">Arquitectura Frontend</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-lg max-w-lg">
                  Construcción de interfaces robustas y asíncronas utilizando React, Next.js y TypeScript. Enfoque en rendimiento (Core Web Vitals) y validación estricta de datos (Zod).
                </p>
              </div>
            </div>
            <SiReact className="absolute -bottom-10 -right-10 w-64 h-64 text-zinc-200 dark:text-zinc-800/20 opacity-30 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />
          </motion.div>

          {/* 4. DATA ARCHITECTURE (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-white dark:bg-[#1d1d1f] p-8 border border-zinc-100 dark:border-white/5 shadow-sm"
          >
            <Database className="w-10 h-10 text-zinc-900 dark:text-white mb-6" />
            <h3 className="text-2xl font-bold mb-3">Data Engineering</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
              Modelado de esquemas relacionales y NoSQL, con enfoque en integridad y sanitización de consultas.
            </p>
            <div className="flex gap-4">
              <SiPostgresql className="w-7 h-7 text-zinc-400" />
              <SiMysql className="w-7 h-7 text-zinc-400" />
              <SiNodedotjs className="w-7 h-7 text-zinc-400" />
            </div>
          </motion.div>

          {/* 5. PYTHON & AUTOMATION (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-zinc-900 p-8 text-white border border-white/10"
          >
            <SiPython className="w-10 h-10 text-yellow-500 mb-6" />
            <h3 className="text-2xl font-bold mb-3">Automation</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Desarrollo de scripts defensivos, automatización de tareas y procesamiento de datos.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 text-[10px] bg-white/10 rounded-md font-mono">Algoritmia</span>
              <span className="px-2 py-1 text-[10px] bg-white/10 rounded-md font-mono">Scraping</span>
            </div>
          </motion.div>

          {/* 6. SOFTWARE ENGINEERING CORE (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-zinc-100 dark:bg-zinc-800 p-8 border border-zinc-200 dark:border-white/5"
          >
            <Cpu className="w-10 h-10 text-zinc-900 dark:text-white mb-6" />
            <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">Low-Level Core</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
              Fundamentos sólidos en gestión de memoria, punteros y estructuras de datos complejas.
            </p>
            <div className="flex items-center gap-2">
              <SiCplusplus className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              <span className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300">C++ Programming</span>
            </div>
          </motion.div>

          {/* 7. OBSERVABILIDAD & UI/UX (Ancho: 2 col) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 rounded-[3rem] bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-[#111] dark:to-[#1a1a1c] p-10 flex flex-col md:flex-row gap-10 items-center border border-zinc-200 dark:border-white/5"
          >
            <div className="md:w-1/2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center">
                  <LayoutTemplate className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">UI/UX & Observabilidad</h3>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Transformo datos complejos en interfaces accionables. Experiencia en diseño de Dashboards tácticos (Grafana) para monitorización y análisis forense.
              </p>
            </div>
            <div className="md:w-1/2 grid grid-cols-2 gap-4 w-full">
              <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-zinc-200 dark:border-white/5 flex flex-col items-center justify-center text-center">
                <SiGrafana className="w-8 h-8 text-orange-500 mb-2" />
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Grafana / Loki</p>
              </div>
              <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-zinc-200 dark:border-white/5 flex flex-col items-center justify-center text-center">
                <LineChart className="w-8 h-8 text-zinc-400 mb-2" />
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">Data Visualization</p>
              </div>
            </div>
          </motion.div>

          {/* 8. SOFT SKILLS & MENTORING (Ancho: 1 col) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-[2.5rem] bg-white dark:bg-[#1d1d1f] p-8 border border-zinc-200 dark:border-white/5 shadow-sm"
          >
            <Users className="w-10 h-10 text-emerald-500 mb-6" />
            <h3 className="text-2xl font-bold mb-3 text-zinc-900 dark:text-white">Technical Mentoring</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-4">
              Capacidad demostrada para traducir conceptos técnicos complejos a equipos no técnicos. Liderazgo, pensamiento crítico y resolución de problemas bajo presión.
            </p>
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Comunicación Asertiva</span>
          </motion.div>

        </div>
      </div>
    </section>
  );
}