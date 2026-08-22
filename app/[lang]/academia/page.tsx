import type { Metadata } from 'next';
import AcademyPage from '@/components/AcademyPage';
import { altLangs } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ lang: 'es' | 'en' }> }): Promise<Metadata> {
  const { lang } = await params;
  return {
    title: lang === 'es' ? 'Academia — CescJavier' : 'Academy — CescJavier',
    description:
      lang === 'es'
        ? 'La Academia: aprende desarrollo full-stack, ciberseguridad aplicada y fundamentos de informática con proyectos reales. Incluida en el plan todo-en-uno.'
        : 'The Academy: learn full-stack development, applied cybersecurity and computer science fundamentals with real projects. Included in the all-in-one plan.',
    alternates: altLangs('/academia', lang),
  };
}

export default async function AcademiaPage({ params }: { params: Promise<{ lang: 'es' | 'en' }> }) {
  const { lang } = await params;
  return <AcademyPage lang={lang} />;
}
