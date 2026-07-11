import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import '@/app/globals.css';

import SmoothScroll from '@/components/SmoothScroll';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getDictionary } from '@/get-dictionary';

const inter = Inter({ subsets: ['latin'] });

// ─── 1. METADATA DINÁMICA CON PARAMS ASÍNCRONOS ─────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  // Desempaquetamos la promesa (Requisito Next.js 15+)
  const { lang } = await params;
  const baseUrl = 'https://cescjavier.dev';

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: 'Kevin Montatixe | Cybersecurity Engineer & Software Architect',
      template: '%s | Kevin Montatixe'
    },
    description: 'Ingeniero de Software y Ciberseguridad. Especialista en DevSecOps, arquitecturas web escalables y sistemas de defensa activa.',
    keywords: ['Cybersecurity', 'DevSecOps', 'Next.js', 'Kevin Montatixe', 'Ingeniero de Software', 'Pentesting', 'Ecuador'],
    authors: [{ name: 'Kevin Javier Montatixe' }],
    creator: 'Kevin Montatixe',
    openGraph: {
      type: 'website',
      locale: lang === 'es' ? 'es_EC' : 'en_US', 
      url: `${baseUrl}/${lang}`,
      title: 'Kevin Montatixe | Cybersecurity Engineer',
      description: 'Arquitectura de software con seguridad implacable. Explora mi portafolio, investigaciones y proyectos DevSecOps.',
      siteName: 'Kevin Montatixe Portfolio',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Kevin Montatixe | DevSecOps Engineer',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    alternates: {
      canonical: `${baseUrl}/${lang}`,
      languages: {
        'es': `${baseUrl}/es`,
        'en': `${baseUrl}/en`,
        'x-default': `${baseUrl}/es`,
      },
    },
  };
}

// ─── 2. GENERACIÓN DE RUTAS ──────────────────────────────────────────────────
export async function generateStaticParams() {
  return [{ lang: 'es' }, { lang: 'en' }];
}

// ─── 3. ESTA ES LA FUNCIÓN ROOT LAYOUT (Dentro del archivo layout.tsx) ───────
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: 'es' | 'en' }>;
}>) {
  // Desempaquetamos la promesa (Requisito Next.js 15+)
  const { lang } = await params;
  
  // Carga del diccionario en el servidor
  const dict = await getDictionary(lang);
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "inLanguage": lang,
    "name": "Kevin Javier Montatixe",
    "url": "https://cescjavier.dev",
    "jobTitle": "Cybersecurity Engineer",
    "alumniOf": [
      { "@type": "CollegeOrUniversity", "name": "Pontificia Universidad Católica del Ecuador" },
      { "@type": "CollegeOrUniversity", "name": "Universidad Central del Ecuador" }
    ],
    "sameAs": [
      "https://www.linkedin.com/in/kevin-javier-montatixe-2a08b6295/",
      "https://github.com/CescJavier7"
    ]
  };

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${inter.className} antialiased transition-colors duration-500 flex flex-col min-h-screen`}>
        {/*
          Script anti-flash de tema, vía next/script con strategy="beforeInteractive":
          esta es la forma soportada por Next.js para inyectar un script que se
          ejecuta ANTES de la hidratación (un <script> crudo en JSX genera el
          warning "Encountered a script tag while rendering React component",
          porque React no lo re-ejecuta en navegaciones cliente-cliente).
          Aplica la clase 'dark' (o la quita) sobre <html> según lo que el
          usuario eligió la última vez (localStorage), así el tema sobrevive
          a cambios de idioma sin parpadeo y sin reiniciarse.
        */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function () {
              try {
                var stored = localStorage.getItem('theme');
                var isDark = stored ? stored === 'dark' : true; // dark por defecto
                document.documentElement.classList.toggle('dark', isDark);
              } catch (e) {}
            })();
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SmoothScroll>
          <NavBar dict={dict.navigation} lang={lang} />
          
          <main className="flex-grow">
            {children}
          </main>
          
          <Footer dict={dict.footer} />
        </SmoothScroll>
      </body>
    </html>
  );
}