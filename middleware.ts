import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config"; // Config LIGERA, sin Prisma/bcrypt
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ['es', 'en'];
const defaultLocale = 'es';

function getLocale(request: any): string | undefined {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value: string, key: string) => (negotiatorHeaders[key] = value));
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  return matchLocale(languages, locales, defaultLocale);
}

// Instancia edge-safe de NextAuth, usando SOLO authConfig (sin providers reales).
// El callback "authorized" dentro de authConfig ya maneja la protección de
// /meka-admin y /api/admin, así que aquí solo agregamos la lógica de i18n.
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;

  // ==========================================
  // LÓGICA DE INTERNACIONALIZACIÓN (i18n)
  // ==========================================
  // Excepciones: Archivos estáticos, APIs, y el panel de admin
  // (la protección de /meka-admin ya la resuelve el callback "authorized"
  // de authConfig antes de que este código se ejecute).
  if (
    pathname.startsWith(`/_next/`) ||
    pathname.includes('/api/') ||
    pathname.startsWith('/meka-admin') ||
    pathname.endsWith('.xml') ||
    pathname.endsWith('.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|webp)$/)
  ) {
    return;
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|.*\\.[\\w]+$).*)'],
};