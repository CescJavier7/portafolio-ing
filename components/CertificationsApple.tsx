// Archivo: components/CertificationsApple.tsx
'use client';
import { motion } from 'framer-motion';
import { ShieldCheck, Trophy, Award, ExternalLink } from 'lucide-react';

const certs = [
  {
    title: 'Cisco CyberGames Americas 2026',
    issuer: 'Cisco Networking Academy',
    date: 'Junio 2026',
    description: 'Participación destacada en la competencia continental Capture The Flag (CTF), logrando clasificar en el Top 135 resolviendo retos de criptografía, esteganografía y análisis de vulnerabilidades.',
    icon: Trophy,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20'
  },
  {
    title: 'CompTIA Security+',
    issuer: 'CompTIA',
    date: 'En preparación',
    description: 'Certificación global que valida las habilidades fundamentales para realizar funciones básicas de seguridad y seguir una carrera en seguridad de TI.',
    icon: ShieldCheck,
    color: 'text-apple-blue',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20'
  },
  {
    title: 'Licenciatura en Pedagogía de la Informática',
    issuer: 'Universidad Central del Ecuador',
    date: 'Diciembre 2023',
    description: 'Título de tercer nivel. Fusión de conocimientos en ciencias de la computación con metodologías de enseñanza técnica.',
    icon: Award,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  }
];

export default function CertificationsApple() {
  return (
    <section className="py-24 bg-white dark:bg-black transition-colors duration-500">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-apple-blue font-bold tracking-tight mb-3 uppercase text-xs italic">Validación Continua</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter mb-6 text-zinc-900 dark:text-white">
            Certificaciones y Logros.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certs.map((cert, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="relative group p-8 rounded-[2.5rem] bg-[#f5f5f7] dark:bg-[#111111] border border-zinc-200 dark:border-white/5 overflow-hidden flex flex-col h-full"
            >
              {/* Efecto Glow en Hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                   style={{ background: `radial-gradient(circle at top right, var(--tw-gradient-stops))` }}>
                <div className={`absolute -top-24 -right-24 w-48 h-48 ${cert.bg} blur-3xl rounded-full`} />
              </div>

              <div className="relative z-10 flex-grow">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${cert.bg} ${cert.border} border`}>
                  <cert.icon className={`w-7 h-7 ${cert.color}`} />
                </div>
                
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 tracking-tight">
                  {cert.title}
                </h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">{cert.issuer}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                  <span className="text-xs font-mono text-zinc-500">{cert.date}</span>
                </div>
                
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
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