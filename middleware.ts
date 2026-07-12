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

export const config = {
  matcher: [
    /*
     * EL BYPASS NUCLEAR:
     * Ignora todas las rutas que comiencen con:
     * - api (endpoints)
     * - _next/static (archivos estáticos de JS/CSS)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, icon, apple-icon, opengraph-image, twitter-image (Tus assets dinámicos)
     * - Cualquier ruta que termine en una extensión de archivo (ej. .png, .jpg, .svg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|.*\\.[\\w]+$).*)',
  ],
};