'use client';

import { motion } from 'framer-motion';
import { ShieldAlert, BrainCircuit, Search, Terminal, GraduationCap, Briefcase, ExternalLink } from 'lucide-react';
import { SiReact, SiNodedotjs, SiKalilinux, SiGithub } from 'react-icons/si';
import SkillsApple from '../components/SkillsApple';
import AboutAppleScroll from '../components/AboutAppleScroll';
import WorkExperienceApple from '../components/WorkExperienceApple';
import ContactApple from '../components/ContactApple';

// --- DATOS ---
const skills = [
  { title: 'Desarrollo Frontend Senior', description: 'Interfaces de alto rendimiento con React, Next.js 15 y Tailwind v4.', icon: SiReact, techs: ['React 19', 'Next.js 15', 'TypeScript', 'Tailwind'], className: 'col-span-1 md:col-span-2 row-span-1 glass' },
  { title: 'Backend Robusto', description: 'APIs RESTful seguras con Node.js, Express y bases de datos SQL/NoSQL.', icon: SiNodedotjs, techs: ['Node.js', 'PostgreSQL', 'Auth'], className: 'col-span-1 md:col-span-1 row-span-1 bg-apple-gray dark:bg-apple-dark' },
  { title: 'Hacking Ético & Pentesting', description: 'Auditoría de aplicaciones web y redes para identificar vectores de ataque.', icon: SiKalilinux, techs: ['Web PenTesting', 'Burp Suite', 'Kali Linux'], className: 'col-span-1 md:col-span-1 row-span-2 bg-black text-white dark:bg-apple-blue dark:text-white' },
  { title: 'Blue Team (Defensa)', description: 'Configuración de infraestructuras seguras y Hardening de servidores.', icon: ShieldAlert, techs: ['Hardening', 'Firewalls', 'Cryptography'], className: 'col-span-1 md:col-span-2 row-span-1 bg-apple-gray dark:bg-apple-dark' },
];

const projects = [
  {
    title: "SecureVault",
    category: "Ciberseguridad / Fullstack",
    description: "Una aplicación web ultra-segura para gestión de contraseñas corporativas. Implementa cifrado AES-256 de extremo a extremo, autenticación multifactor (MFA) y está protegida contra ataques OWASP Top 10.",
    techs: ["Next.js", "TypeScript", "PostgreSQL", "Bcrypt", "Tailwind"],
    github: "#",
    demo: "#"
  },
  {
    title: "E-Commerce Monolith",
    category: "Desarrollo Web",
    description: "Plataforma de comercio electrónico de alto rendimiento capaz de procesar pagos con Stripe. Incluye un panel de administración (Dashboard) con analíticas en tiempo real.",
    techs: ["React", "Node.js", "Stripe API", "MongoDB", "Framer Motion"],
    github: "#",
    demo: "#"
  }
];

const timeline = [
  {
  year: "2024 - Presente",
  title: "Ingeniería en Ciberseguridad y Gestión de las Tecnologías de Información",
  role: "Pontificia Universidad Católica del Ecuador",
  description: "Formación enfocada en ciberseguridad aplicada, abarcando análisis de vulnerabilidades, hardening y prácticas en entornos controlados (CTFs, Hack The Box). Complemento mi aprendizaje con contenidos y laboratorios basados en tecnologías de Google Cloud.",
  icon: GraduationCap
},
{
  year: "2018 - 2023",
  title: "Licenciatura en Informática",
  role: "Universidad Central del Ecuador",
  description: "Adquirí fundamentos sólidos en programación, estructuras de datos, algoritmos y arquitectura de sistemas. Esta etapa fortaleció mi pensamiento lógico, análisis de problemas y comprensión del funcionamiento interno del software.",
  icon: GraduationCap
}];

const transitionSettings = { duration: 0.8, ease: [0.16, 1, 0.3, 1] };

export default function Home() {
  return (
    // Quitamos el pt-16 del main global para que la pantalla negra del inicio ocupe el 100% del borde superior
<main className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased">
      
      {/* 1. AHORA ESTO ES LO PRIMERO QUE VEN (EFECTO APPLE SCROLL) */}
      <AboutAppleScroll />

      {/* 2. HERO TÉCNICO (Ahora aparece justo después de la introducción personal) */}
      <section className="h-[80vh] flex flex-col items-center justify-center text-center px-4 border-b border-gray-100 dark:border-white/5">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={transitionSettings} className="max-w-4xl">
          <p className="text-apple-blue font-semibold tracking-tight mb-3">Ciencia, Software, Informática & Ciberseguridad</p>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-5 text-balance leading-[0.95]">
            Código limpio. <br /> <span className="text-gray-400 dark:text-gray-500">Seguridad implacable.</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto text-balance">
Aplico pensamiento lógico, matemático y estructurado para desarrollar sistemas eficientes, seguros y preparados para el mundo real.          </p>
        </motion.div>
      </section>
      {/* 3. BENTO GRID (HABILIDADES) */}
<SkillsApple />


      {/* 4. PROYECTOS */}
      <section id="proyectos" className="py-24 max-w-6xl mx-auto px-6">
        <motion.header className="mb-16 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={transitionSettings}>
          <p className="text-apple-blue font-medium mb-2 text-sm">Portafolio</p>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Construido para el mundo real.</h2>
        </motion.header>

        <div className="flex flex-col gap-12">
          {projects.map((project) => (
            <motion.div 
              key={project.title}
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={transitionSettings}
              className="group relative flex flex-col md:flex-row gap-8 items-center p-8 md:p-12 rounded-[2.5rem] bg-apple-gray dark:bg-[#080808] border border-gray-100 dark:border-white/5 overflow-hidden"
            >
              <div className="md:w-1/2 z-10">
                <p className="text-xs font-mono text-apple-blue mb-4 uppercase tracking-widest">{project.category}</p>
                <h3 className="text-3xl font-bold tracking-tight mb-4">{project.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg leading-relaxed text-balance">
                  {project.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {project.techs.map(tech => (
                    <span key={tech} className="px-3 py-1 text-xs font-medium rounded-md bg-black/5 dark:bg-white/10 text-black dark:text-white">
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <a href={project.github} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-medium hover:scale-105 transition-transform text-sm">
                    <SiGithub className="w-4 h-4" /> Código
                  </a>
                  <a href={project.demo} className="flex items-center gap-2 px-5 py-2.5 rounded-full text-black dark:text-white border border-gray-300 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium">
                    <ExternalLink className="w-4 h-4" /> Live Demo
                  </a>
                </div>
              </div>

              <div className="md:w-1/2 w-full h-64 md:h-full min-h-[300px] rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-[#111] dark:to-[#222] relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-700 flex items-center justify-center p-8">
                 <div className="relative z-10 w-full h-full rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-white/20 dark:border-white/5 p-4 flex flex-col shadow-2xl">
                    <div className="flex gap-1.5 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400 space-y-1">
                      <p><span className="text-apple-blue">cesc@macbook</span> ~ % ./deploy</p>
                      <p>Building secure monolithic app...</p>
                      <p className="text-green-500">Success. Deployed to production.</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 5. TRAYECTORIA (TIMELINE) */}
      <section id="trayectoria" className="py-24 max-w-6xl mx-auto px-6">
        <motion.header className="mb-20 text-center" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={transitionSettings}>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Evolución Continua.</h2>
        </motion.header>

        <div className="relative border-l border-gray-200 dark:border-white/10 ml-4 md:ml-0 md:pl-0">
          {timeline.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="mb-20 md:mb-32 relative group">
                <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-start">
                  <div className="md:w-1/3 md:text-right sticky top-24 pt-2 md:pt-0">
                    <div className="absolute w-4 h-4 bg-apple-blue rounded-full -left-[25px] top-4 md:hidden border-4 border-white dark:border-black"></div>
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-300 dark:text-gray-700 tracking-tighter">{item.year}</h3>
                  </div>
                  <motion.div className="md:w-2/3 pl-8 md:pl-12 border-l border-transparent md:border-gray-200 md:dark:border-white/10 relative" initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.4 }} transition={transitionSettings}>
                    <div className="hidden md:block absolute w-4 h-4 bg-apple-blue rounded-full -left-[9px] top-2 border-4 border-white dark:border-black transition-transform group-hover:scale-150"></div>
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-6 h-6 text-apple-blue" />
                      <h4 className="text-2xl font-semibold tracking-tight">{item.title}</h4>
                    </div>
                    <p className="text-apple-blue font-medium text-sm mb-4">{item.role}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed text-balance">{item.description}</p>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {/* 6. EXPERIENCIA LABORAL (ACORDEÓN APPLE) */}
      <WorkExperienceApple />

      {/* FOOTER SIMPLE ESTILO APPLE */}
      <footer className="py-12 border-t border-zinc-100 dark:border-white/5 text-center">
        <p className="text-zinc-400 text-xs font-medium">
          © {new Date().getFullYear()} Cesc Javier. Diseñado bajo estándares de ingeniería y estética Apple.
        </p>
      </footer>

      {/* 6. SECCIÓN DE CONTACTO */}
      <ContactApple />

      {/* FOOTER SIMPLE ESTILO APPLE */}
      <footer className="py-12 border-t border-zinc-100 dark:border-white/5 text-center">
        <p className="text-zinc-400 text-xs font-medium">
          © {new Date().getFullYear()} Cesc Javier. Diseñado bajo estándares de ingeniería y estética Apple.
        </p>
      </footer>

    </main>
  );
}