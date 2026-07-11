import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';

import { ThemeProvider } from '@/components/ThemeProvider';
import SmoothScroll from '@/components/SmoothScroll';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getDictionary } from '@/get-dictionary';

const inter = Inter({ subsets: ['latin'] });

// ─── 1. METADATA DINÁMICA CON PARAMS ASÍNCRONOS ─────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
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
      description: 'Arquitectura de software con seguridad implacable. Explora mi portafolio.',
      siteName: 'Kevin Montatixe Portfolio',
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

// ─── 3. ROOT LAYOUT ──────────────────────────────────────────────────────────
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  // Desempaquetamos de forma segura y sanitizamos el parámetro de idioma
  const { lang: rawLang } = await params;
  const lang: 'es' | 'en' = rawLang === 'en' ? 'en' : 'es';
  
  // Extraemos la fuente de la verdad
  const dict = await getDictionary(lang);
  
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "inLanguage": lang,
    "name": "Kevin Javier Montatixe",
    "url": "https://cescjavier.dev",
    "jobTitle": "Cybersecurity Engineer"
  };

  return (
    // suppressHydrationWarning es vital en el tag html cuando usas next-themes
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} antialiased transition-colors duration-500 flex flex-col min-h-screen bg-white dark:bg-black`}>
        {/* Proveedor de tema: Activa enableSystem para detectar OS del usuario */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SmoothScroll>
            <NavBar dict={dict.navigation} lang={lang} />
            
            <main className="flex-grow">
              {children}
            </main>
            
            <Footer dict={dict.footer} />
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  );
}