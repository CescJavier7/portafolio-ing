import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import SmoothScroll from '../components/SmoothScroll';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer'; // <-- 1. Importamos el Footer

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cesc Javier | Ciberseguridad & Desarrollo',
  description: 'Portafolio profesional y blog técnico',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased transition-colors duration-500 flex flex-col min-h-screen`}>
        <SmoothScroll>
          <NavBar />
          {/* El contenedor principal crece para empujar el footer al fondo */}
          <main className="flex-grow">
            {children}
          </main>
          <Footer /> {/* <-- 2. Añadimos el Footer al final */}
        </SmoothScroll>
      </body>
    </html>
  );
}