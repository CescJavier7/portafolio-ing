'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
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
  Network,
  type LucideIcon,
} from 'lucide-react';

// ─── METADATA VISUAL Y DE ACTIVOS (NO TRADUCIBLE) ────────────────────────────
// El orden de este array es fijo y debe coincidir 1:1 con `dict.items` que
// llega desde el diccionario. Los assets (imagen, icono, color) no cambian
// entre idiomas, solo el texto que viaja por props.
const certVisuals: {
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  image: string;
}[] = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', image: '/cisco-ctf.jpg' },
  { icon: ShieldCheck, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', image: '/hacking-etico-big.jpg' },
  { icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', image: '/english-certificates.jpg' },
  { icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', image: '/prompts-ia.jpg' },
  { icon: Network, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', image: '/cisco-ethical-hacker.jpg' },
  { icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', image: '/neurociencias-puce.jpg' },
  { icon: Code, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', image: '/desarrollo-ia-big.jpg' },
  { icon: Lock, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-500/20', image: '/proteccion-datos.jpg' },
  { icon: Cpu, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', image: '/intro-ciberseguridad-telefonica.jpg' },
  { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', image: '/cisco-intro-cyber.jpg' },
  { icon: Award, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20', image: '/ubicua-abp.jpg' },
];

// ─── TIPADO DEL DICCIONARIO ───────────────────────────────────────────────────
interface CertificationItemDictionary {
  title: string;
  issuer: string;
  date: string;
  description: string;
}

interface CertificationsDictionary {
  tag: string;
  title: string;
  description: string;
  items: CertificationItemDictionary[];
}

interface CertificationsAppleProps {
  dict?: CertificationsDictionary;
}

export default function CertificationsApple({ dict }: CertificationsAppleProps) {
  // Programación defensiva: sin diccionario válido, no renderizamos nada roto.
  if (!dict?.items?.length) {
    console.error("Critical: 'dict.items' is missing in CertificationsApple");
    return null;
  }

  const certs = dict.items
    .slice(0, certVisuals.length)
    .map((item, i) => ({ ...item, ...certVisuals[i] }));

  return (
    <section id="certificados" className="py-24 bg-white dark:bg-black transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-blue-500 font-bold tracking-tight mb-3 uppercase text-xs italic">{dict.tag}</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 text-zinc-900 dark:text-white">
            {dict.title}
          </h2>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl text-balance">
            {dict.description}
          </p>
        </motion.div>

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
                
                {/* IMPLEMENTACIÓN NATIVA DE NEXT.JS */}
                <Image 
                  src={cert.image} 
                  alt={`Certificado de ${cert.title}`} 
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, (max-width: 1440px) 33vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
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