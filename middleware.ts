import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ['es', 'en'];
const defaultLocale = 'es';

function getLocale(request: NextRequest): string | undefined {
  // Negociamos el idioma usando las cabeceras del navegador del usuario
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return matchLocale(languages, locales, defaultLocale);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Evitamos procesar rutas de archivos estáticos (imágenes, favicons, robots.txt)
  if (
    pathname.startsWith(`/_next/`) ||
    pathname.includes('/api/') ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp)$/)
  ) {
    return;
  }

  // Verificamos si la ruta ya tiene un idioma (ej: /es/blog)
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Si no tiene idioma, detectamos el preferido y redirigimos (ej: /blog -> /es/blog)
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

// Agrega esto al final de tu middleware.ts
export const config = {
  matcher: [
    /*
     * Intercepta todas las rutas excepto:
     * 1. /api/ (rutas de backend)
     * 2. /_next/ (archivos internos de Next.js)
     * 3. /_static (archivos estáticos)
     * 4. Archivos con extensiones (imágenes, favicons, etc.)
     */
    '/((?!api|_next|_static|[\\w-]+\\.\\w+).*)',
  ],
};