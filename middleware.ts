// ./middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
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

    return matchLocale(languages, locales, defaultLocale);
  } catch (error) {
    console.warn('[MIDDLEWARE_SHIELD] Cabecera de idioma malformada detectada. Forzando fallback a "es".');
    return defaultLocale;
  }
}

// ============================================================
// PERÍMETRO DE ADMINISTRACIÓN
// ============================================================
// IMPORTANTE: usamos getToken() de next-auth/jwt directamente,
// NO importamos tu lib/auth.ts completo aquí. Si auth.ts monta el
// PrismaAdapter, importarlo en el middleware rompe el build/runtime,
// porque el Edge Runtime no soporta el cliente de Prisma. getToken
// solo decodifica el JWT de la cookie de sesión: es edge-safe.
const ADMIN_PAGE_PREFIX = '/meka-admin';
const ADMIN_API_PREFIX = '/api/admin';
const ADMIN_LOGIN_PATH = '/meka-admin/login';

async function getAdminToken(request: NextRequest) {
  return getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
}

// AJUSTA ESTO: el nombre del campo de rol debe coincidir exactamente
// con lo que expones en el callback `jwt()` de lib/auth.config.ts.
// Si tu token no trae `role`, este check siempre fallará "en falso seguro"
// (deniega acceso), lo cual es el comportamiento correcto por defecto.
function hasAdminRole(token: Awaited<ReturnType<typeof getAdminToken>>): boolean {
  if (!token) return false;
  const role = (token as { role?: string }).role;
  return role === 'ADMIN' || role === 'ANALYST';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Panel admin (páginas HTML): sin sesión válida -> redirect a login
  if (pathname.startsWith(ADMIN_PAGE_PREFIX)) {
    if (pathname === ADMIN_LOGIN_PATH) {
      return NextResponse.next();
    }
    const token = await getAdminToken(request);
    if (!hasAdminRole(token)) {
      const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. API admin: sin sesión válida -> 401 JSON (nunca redirect en una API)
  if (pathname.startsWith(ADMIN_API_PREFIX)) {
    const token = await getAdminToken(request);
    if (!hasAdminRole(token)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 3. Resto de rutas internas: estáticos, otras APIs, archivos con extensión
  const isInternalRoute =
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.');

  if (isInternalRoute) {
    return NextResponse.next();
  }

  // 4. Comprobación de si el pathname ya tiene un locale soportado
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // 5. Redirección con locale extraído de forma segura
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.redirect(request.nextUrl);
}

// Configuración del matcher: OJO, a diferencia de la versión anterior,
// '/meka-admin' y '/api' YA NO se excluyen aquí, porque el middleware
// necesita ejecutarse sobre ellas para aplicar el guard de sesión.
// El bypass de estáticos/imágenes se mantiene igual.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};