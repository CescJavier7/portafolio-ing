import type { Metadata } from 'next';
import AcademyPage from '@/components/AcademyPage';

export const metadata: Metadata = {
  title: 'Academia — CescJavier',
  description:
    'La Academia: aprende desarrollo full-stack, ciberseguridad aplicada y fundamentos de informática con proyectos reales. Incluida en el plan todo-en-uno.',
};

export default async function AcademiaPage({ params }: { params: Promise<{ lang: 'es' | 'en' }> }) {
  const { lang } = await params;
  return <AcademyPage lang={lang} />;
}
