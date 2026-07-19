'use client';

import { Construction } from 'lucide-react';
import { SectionHeader } from '@/components/sentra/panel/OverviewSection';

// Placeholder honesto para las capas futuras de la infraestructura (DNS,
// tráfico, grafo). No finge datos: comunica la visión sin mentir.
export default function ComingSoon({
  icon,
  title,
  subtitle,
  bodyTitle,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bodyTitle: string;
  body: string;
}) {
  return (
    <div>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      <div className="rounded-3xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 p-12 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-5 text-green-500">
          <Construction className="w-7 h-7" />
        </div>
        <p className="text-base font-bold text-zinc-900 dark:text-white mb-2">{bodyTitle}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-md mx-auto">{body}</p>
      </div>
    </div>
  );
}
