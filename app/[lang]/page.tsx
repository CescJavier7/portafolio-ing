import { getDictionary } from '@/get-dictionary';
import AboutAppleScroll from '@/components/AboutAppleScroll';
import SkillsApple from '@/components/SkillsApple';
import ProjectsApple from '@/components/ProjectApple';
import CertificationsApple from '@/components/CertificationsApple';
import WorkExperienceApple from '@/components/WorkExperienceApple';
import ContactApple from '@/components/ContactApple';

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  // 1. Resolvemos parámetros y cargamos el diccionario
  const { lang } = await params;
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