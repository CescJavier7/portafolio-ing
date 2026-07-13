// lib/auth.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "MEKA_ADMIN",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("\n[AUTH] 1. Intentando loguear email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("[AUTH] ❌ Faltan credenciales");
          return null;
        }

        const user = await prisma.adminUser.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          console.log("[AUTH] ❌ Usuario no encontrado en la base de datos.");
          return null;
        }

        console.log("[AUTH] 2. Usuario encontrado en DB. Verificando hash...");

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          console.log("[AUTH] ❌ Contraseña incorrecta. El hash no coincide.");
          return null;
        }

        console.log("[AUTH] ✅ ¡ACCESO CONCEDIDO! Generando token...");
        return { id: user.id, email: user.email };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
});