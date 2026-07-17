'use client';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Server, Database, Cpu, 
  Layers, LineChart, Users, LayoutTemplate, Code2, Cloud, Zap
} from 'lucide-react';
import { 
  SiReact, SiNodedotjs, SiKalilinux, SiPython, 
  SiDocker, SiPostgresql, SiMysql, SiCplusplus, SiLinux, SiGrafana,
  SiNextdotjs, SiTypescript, SiTailwindcss, SiPrisma, SiRedis, SiFastapi,
  SiCloudflare, SiFigma, SiSwift, SiPhp, SiTraefikmesh
} from 'react-icons/si';
import { FaJava } from 'react-icons/fa'; // Solución al problema de compilación de SiJava

interface SkillsProps {
  dict: {
    tag: string;
    title: string;
    subtitle: string;
    description: string;
    cards: {
      cyber: { title: string; desc: string; };
      cloud: { title: string; desc: string; };
      fullstack: { title: string; desc: string; };
      languages: { title: string; desc: string; };
      data: { title: string; desc: string; };
      quant: { title: string; desc: string; };
      uiux: { title: string; desc: string; };
      soft: { title: string; desc: string; tag: string; };
    };
  };
}

export default function SkillsApple({ dict }: SkillsProps) {
  // Graceful degradation: si el diccionario aún no se ha inyectado, no renderizamos para evitar crashes.
  if (!dict || !dict.cards) return null;

  return (
    <section id="habilidades" className="py-24 bg-zinc-50 dark:bg-[#020617] transition-colors duration-500 overflow-hidden selection:bg-green-500/30">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        
        {/* CABECERA DINÁMICA */}
        <motion.div 
          className="mb-20 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-green-500 font-bold tracking-widest mb-3 uppercase text-xs">{dict.tag}</p>
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 text-zinc-900 dark:text-zinc-100 leading-tight">
            {dict.title} <br /> <span className="text-zinc-400 dark:text-zinc-500">{dict.subtitle}</span>
          </h2>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl font-medium">
            {dict.description}
          </p>
        </motion.div>

        {/* BENTO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[minmax(280px,_auto)]">

          {/* 1. DEVSECOPS & CIBERSEGURIDAD (2 Columnas) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl bg-zinc-900 dark:bg-zinc-950 p-8 md:p-10 group border border-zinc-800 shadow-xl"
          >
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] group-hover:opacity-10 transition-opacity duration-700" 
                 style={{ backgroundImage: 'radial-gradient(#4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.1)]">
                    <ShieldCheck className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center">
                    <SiKalilinux className="w-6 h-6 text-zinc-300" />
                  </div>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">{dict.cards.cyber.title}</h3>
                <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-6 max-w-md">
                  {dict.cards.cyber.desc}
                </p>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {['Metasploit', 'Nmap', 'Iptables', 'OWASP Top 10', 'Wi-Fi Auditing', 'Zero-Trust'].map(tag => (
                    <span key={tag} className="px-3 py-1 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. INFRAESTRUCTURA & CLOUD (2 Columnas) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 lg:col-span-2 relative overflow-hidden rounded-3xl bg-blue-600 dark:bg-blue-900/40 p-8 md:p-10 text-white border border-blue-500/30 flex flex-col justify-between shadow-xl"
          >
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 transition-transform duration-500">
              <Server className="w-40 h-40" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center mb-6">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold mb-3">{dict.cards.cloud.title}</h3>
              <p className="text-blue-100 dark:text-blue-200 text-sm md:text-base leading-relaxed mb-6 max-w-sm">
                {dict.cards.cloud.desc}
              </p>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 mt-auto">
              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg backdrop-blur-sm border border-white/10">
                <SiDocker className="w-4 h-4" /> <span className="text-xs font-bold">Docker</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg backdrop-blur-sm border border-white/10">
              <SiTraefikmesh className="w-4 h-4" /> <span className="text-xs font-bold">Traefik</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg backdrop-blur-sm border border-white/10">
                <SiLinux className="w-4 h-4" /> <span className="text-xs font-bold">VPS Linux</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg backdrop-blur-sm border border-white/10">
                <SiCloudflare className="w-4 h-4" /> <span className="text-xs font-bold">Cloudflare</span>
              </div>
            </div>
          </motion.div>

          {/* 3. FULLSTACK MODERNO (2 Columnas) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl bg-white dark:bg-zinc-900/40 p-8 md:p-10 group border border-zinc-200 dark:border-zinc-800 shadow-sm"
          >
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex gap-3 mb-6">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <SiNextdotjs className="w-6 h-6 text-black dark:text-white" />
                  </div>
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <SiTypescript className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                    <SiFastapi className="w-6 h-6 text-teal-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">{dict.cards.fullstack.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base max-w-sm leading-relaxed mb-6">
                  {dict.cards.fullstack.desc}
                </p>
                <div className="flex gap-4 items-center">
                  <SiReact className="w-6 h-6 text-zinc-400 hover:text-blue-500 transition-colors" />
                  <SiTailwindcss className="w-6 h-6 text-zinc-400 hover:text-cyan-400 transition-colors" />
                  <SiNodedotjs className="w-6 h-6 text-zinc-400 hover:text-green-500 transition-colors" />
                </div>
              </div>
            </div>
            <Layers className="absolute -bottom-10 -right-10 w-64 h-64 text-zinc-100 dark:text-zinc-800/30 group-hover:rotate-12 transition-transform duration-700 pointer-events-none" />
          </motion.div>

          {/* 4. CORE LANGUAGES & MOBILE (1 Columna) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-3xl bg-white dark:bg-zinc-900/40 p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <Code2 className="w-8 h-8 text-indigo-500 mb-5" />
              <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">{dict.cards.languages.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
                {dict.cards.languages.desc}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <SiCplusplus className="w-6 h-6 text-zinc-400 hover:text-blue-600 transition-colors" />
              <FaJava className="w-6 h-6 text-zinc-400 hover:text-red-500 transition-colors" />
              <SiSwift className="w-6 h-6 text-zinc-400 hover:text-orange-500 transition-colors" />
              <SiPython className="w-6 h-6 text-zinc-400 hover:text-yellow-500 transition-colors" />
              <SiPhp className="w-6 h-6 text-zinc-400 hover:text-indigo-400 transition-colors" />
            </div>
          </motion.div>

          {/* 5. DATABASES & ORMs (1 Columna) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-3xl bg-white dark:bg-zinc-900/40 p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <Database className="w-8 h-8 text-rose-500 mb-5" />
              <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">{dict.cards.data.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
                {dict.cards.data.desc}
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <SiPostgresql className="w-6 h-6 text-zinc-400 hover:text-blue-400 transition-colors" />
              <SiMysql className="w-7 h-7 text-zinc-400 hover:text-blue-500 transition-colors" />
              <SiPrisma className="w-6 h-6 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors" />
              <SiRedis className="w-6 h-6 text-zinc-400 hover:text-red-500 transition-colors" />
            </div>
          </motion.div>

          {/* 6. ALGORITMIA & FINANZAS QUANTITATIVAS (1 Columna) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-3xl bg-zinc-900 dark:bg-black p-8 text-white border border-zinc-800 shadow-xl flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <LineChart className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <Zap className="w-8 h-8 text-yellow-400 mb-5" />
              <h3 className="text-xl font-bold mb-3">{dict.cards.quant.title}</h3>
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
                {dict.cards.quant.desc}
              </p>
            </div>
            <div className="relative z-10 flex flex-wrap gap-2">
              <span className="px-2 py-1 text-[10px] bg-white/10 rounded font-mono font-bold text-yellow-400 border border-yellow-400/20">MQL4</span>
              <span className="px-2 py-1 text-[10px] bg-white/10 rounded font-mono text-zinc-300">Math / Stats</span>
              <span className="px-2 py-1 text-[10px] bg-white/10 rounded font-mono text-zinc-300">Scraping</span>
            </div>
          </motion.div>

          {/* 7. UX/UI & OBSERVABILIDAD (2 Columnas) */}
          <motion.div 
            whileHover={{ scale: 0.99 }}
            className="md:col-span-2 rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-zinc-900/40 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center border border-orange-200/50 dark:border-orange-900/30 shadow-sm"
          >
            <div className="md:w-1/2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <LayoutTemplate className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">{dict.cards.uiux.title}</h3>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base leading-relaxed">
                {dict.cards.uiux.desc}
              </p>
            </div>
            <div className="md:w-1/2 grid grid-cols-2 gap-4 w-full">
              <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-sm">
                <SiFigma className="w-7 h-7 text-zinc-700 dark:text-zinc-300 mb-2" />
                <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Figma UI</p>
              </div>
              <div className="p-4 bg-white dark:bg-black/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center shadow-sm">
                <SiGrafana className="w-7 h-7 text-orange-500 mb-2" />
                <p className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Grafana Logs</p>
              </div>
            </div>
          </motion.div>

          {/* 8. MENTORÍA & SOFT SKILLS (1 Columna) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            className="rounded-3xl bg-white dark:bg-zinc-900/40 p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between"
          >
            <div>
              <Users className="w-8 h-8 text-emerald-500 mb-5" />
              <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white">{dict.cards.soft.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6">
                {dict.cards.soft.desc}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20">
                {dict.cards.soft.tag}
              </span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}