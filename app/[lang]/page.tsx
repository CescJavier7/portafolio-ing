import { getDictionary } from '@/get-dictionary';
import AboutAppleScroll from '@/components/AboutAppleScroll';
import SkillsApple from '@/components/SkillsApple';
import ProjectsApple from '@/components/ProjectApple';
import CertificationsApple from '@/components/CertificationsApple';
import WorkExperienceApple from '@/components/WorkExperienceApple';
import ContactApple from '@/components/ContactApple';

export default async function Home({
  params,
}: {
  // Next.js 16 espera `string` genérico para segmentos dinámicos en el tipo
  // auto-generado (LayoutProps/PageProps); declarar la unión 'es' | 'en'
  // aquí rompe el build ("does not satisfy the constraint").
  params: Promise<{ lang: string }>;
}) {
  // 1. Resolvemos parámetros, acotamos el tipo con fallback seguro, y
  // cargamos el diccionario
  const { lang: rawLang } = await params;
  const lang: 'es' | 'en' = rawLang === 'en' ? 'en' : 'es';
  const dict = await getDictionary(lang);

  return (
    <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased">
      
      {/* Pasamos los slices correspondientes del diccionario */}
      <AboutAppleScroll dict={dict.about} />

      <SkillsApple dict={dict.skills} />
      
      <ProjectsApple dict={dict.projects} />

      <CertificationsApple dict={dict.certifications} />
      
      <WorkExperienceApple dict={dict.experience} />
      
      <ContactApple dict={dict.contact} />

    </main>
  );
}