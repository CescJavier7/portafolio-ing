import type { Metadata } from 'next';
import { getDictionary } from '@/get-dictionary';
import AboutAppleScroll from '@/components/AboutAppleScroll';
import AcademicBento from '@/components/AcademicBento';
import SkillsApple from '@/components/SkillsApple';
import ProjectsApple from '@/components/ProjectApple';
import CertificationsApple from '@/components/CertificationsApple';
import WorkExperienceApple from '@/components/WorkExperienceApple';
import ContactApple from '@/components/ContactApple';

const BASE = 'https://cescjavier.dev';

// SEO de marca personal, por idioma. Título "absolute": esta es la página que
// debe rankear para "ingeniero de ciberseguridad y desarrollador".
const SEO = {
  es: {
    title: 'Kevin Montatixe · Ingeniero de Ciberseguridad y Desarrollador Full-Stack',
    description:
      'Ingeniero de software y ciberseguridad en Ecuador. Desarrollo web con Next.js y FastAPI, auditorías de seguridad, DevSecOps y pentesting. Creador de Sentra, plataforma de seguridad web.',
    keywords: [
      'ingeniero de ciberseguridad',
      'desarrollador full stack',
      'desarrollador web Ecuador',
      'ingeniero de software',
      'pentesting',
      'DevSecOps',
      'Next.js',
      'FastAPI',
      'ciberseguridad Ecuador',
      'Kevin Montatixe',
    ],
  },
  en: {
    title: 'Kevin Montatixe · Cybersecurity Engineer & Full-Stack Developer',
    description:
      'Software and cybersecurity engineer in Ecuador. Web development with Next.js and FastAPI, security audits, DevSecOps and pentesting. Creator of Sentra, a web security platform.',
    keywords: [
      'cybersecurity engineer',
      'full stack developer',
      'web developer',
      'software engineer',
      'pentesting',
      'DevSecOps',
      'Next.js',
      'FastAPI',
      'Kevin Montatixe',
    ],
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang: 'es' | 'en' = (await params).lang === 'en' ? 'en' : 'es';
  const s = SEO[lang];

  return {
    title: { absolute: s.title },
    description: s.description,
    keywords: [...s.keywords],
    alternates: {
      canonical: `${BASE}/${lang}`,
      languages: { es: `${BASE}/es`, en: `${BASE}/en`, 'x-default': `${BASE}/es` },
    },
    openGraph: {
      type: 'profile',
      url: `${BASE}/${lang}`,
      siteName: 'Kevin Montatixe',
      title: s.title,
      description: s.description,
      locale: lang === 'es' ? 'es_EC' : 'en_US',
    },
  };
}

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: rawLang } = await params;
  const lang: 'es' | 'en' = rawLang === 'en' ? 'en' : 'es';
  const dict = await getDictionary(lang);

  return (
    <main className="min-h-screen bg-white text-black dark:bg-black dark:text-white antialiased">
      <AboutAppleScroll dict={dict.about} />
      {/* FIX: Se pasa 'lang' para usar el diccionario interno, en lugar de dict.contact */}
      <div id="academico">
        <AcademicBento lang={lang} />
      </div>
      <SkillsApple dict={dict.skills} />
      <ProjectsApple dict={dict.projects} />
      <CertificationsApple dict={dict.certifications} />
      <WorkExperienceApple dict={dict.experience} />
      <ContactApple dict={dict.contact} />
    </main>
  );
}