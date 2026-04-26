'use client';

import { ReactNode } from 'react';
import { ReactLenis } from '@studio-freight/react-lenis';

export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    // @ts-ignore - Ignoramos el choque de tipos entre React 19 y Lenis (React 18)
    <ReactLenis root options={{ lerp: 0.05, duration: 1.5, smoothWheel: true }}>
      {children as any}
    </ReactLenis>
  );
}