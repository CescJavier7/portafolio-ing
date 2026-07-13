// lib/auth.config.ts
import type { NextAuthConfig } from "next-auth";

// Config "ligera": SIN providers reales (esos requieren Prisma/bcrypt,
// que no funcionan en el Edge Runtime del middleware). Aquí solo van
// las cosas que sí son compatibles con Edge: páginas, callbacks de
// verificación de sesión (JWT), etc.
export const authConfig = {
  pages: {
    signIn: "/meka-admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isProtectedRoute =
        pathname.startsWith("/meka-admin") || pathname.startsWith("/api/admin");
      const isLoginPage = pathname === "/meka-admin/login";

      if (isProtectedRoute && !isLoginPage) {
        return isLoggedIn; // false → NextAuth redirige automáticamente a "pages.signIn"
      }

      if (isLoginPage && isLoggedIn) {
        return Response.redirect(new URL("/meka-admin", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Se llenan en lib/auth.ts (ese sí corre en Node.js runtime)
} satisfies NextAuthConfig;