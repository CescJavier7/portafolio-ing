import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/app/globals.css';

import { ThemeProvider } from '@/components/ThemeProvider';
import SmoothScroll from '@/components/SmoothScroll';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getDictionary } from '@/get-dictionary';
import MekaSenkuChat from '@/components/MekaSenkuChat'; 
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

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
    // ⚠️ SEO CRÍTICO: el layout NO debe fijar `alternates.canonical`. `generateMetadata`
    // del layout solo conoce `lang`, NO la ruta de la página → poner aquí
    // `canonical: /${lang}` hacía que TODAS las páginas hijas (precios, blog, legal…)
    // heredaran la canonical de la HOME → Google las trataba como duplicados y las
    // sacaba del índice. La canonical/hreflang se define POR PÁGINA (ver lib/seo.ts:
    // `altLangs`). Las páginas que no la fijen auto-canonicalizan a su propia URL.
  };
}

export async function generateStaticParams() {
  return [{ lang: 'es' }, { lang: 'en' }];
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang: rawLang } = await params;
  const lang: 'es' | 'en' = rawLang === 'en' ? 'en' : 'es';
  
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
    <html lang={lang} suppressHydrationWarning>
      <head>
        {/* 🔴 FIX: Inyección de Metadatos SEO estructurados para Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        
        <Script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedScroll = sessionStorage.getItem('i18n_scroll');
                  if (savedScroll) {
                    document.documentElement.style.scrollBehavior = 'auto';
                    window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
                    sessionStorage.removeItem('i18n_scroll');
                  }
                } catch(e) {}
              })();
            `
          }}
        />
        <meta name="view-transition" content="same-origin" />
      </head>
      <body className={`${inter.className} antialiased transition-colors duration-500 flex flex-col min-h-screen bg-white dark:bg-black`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SmoothScroll>
            <NavBar dict={dict.navigation} lang={lang} />
            
            <main className="flex-grow">
              {children}
            </main>
            
            <Footer dict={dict.footer} lang={lang} />
          </SmoothScroll>
        </ThemeProvider>
        
        <MekaSenkuChat lang={lang} dict={dict.chat} />
      </body>
    </html>
  );
}