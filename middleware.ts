// ./middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { match as matchLocale } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['es', 'en'];
const defaultLocale = 'es';

// Función extractora blindada contra cabeceras corruptas
function getLocale(request: NextRequest): string {
  try {
    const negotiatorHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

    const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
    
    // Si la librería falla al parsear una cabecera extraña, pasará al catch
    return matchLocale(languages, locales, defaultLocale);
  } catch (error) {
    // Intercepción silenciosa del RangeError. Retornamos el idioma por defecto.
    console.warn('[MIDDLEWARE_SHIELD] Cabecera de idioma malformada detectada. Forzando fallback a "es".');
    return defaultLocale;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass estricto de rutas internas, estáticos y paneles de administración
  const isInternalRoute = 
    pathname.startsWith('/_next/') || 
    pathname.startsWith('/api/') || 
    pathname.startsWith('/meka-admin') || 
    pathname.includes('.'); // Archivos con extensión (favicon, imágenes)

  if (isInternalRoute) {
    return NextResponse.next();
  }

  // 2. Comprobación de si el pathname ya tiene un locale soportado
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // 3. Redirección con locale extraído de forma segura
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  
  return NextResponse.redirect(request.nextUrl);
}

// Configuración del matcher para evitar ejecuciones innecesarias en el Edge
export const config = {
  matcher: [
    // Ignorar todo lo que empiece por _next, api, meka-admin y archivos estáticos
    '/((?!_next/static|_next/image|api|meka-admin|favicon.ico|.*\\..*).*)',
  ],
};