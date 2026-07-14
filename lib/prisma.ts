// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Prevenimos múltiples instancias de Prisma Client en producción y desarrollo
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'], // Solo registramos errores críticos para salvar CPU
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

// En desarrollo, guardamos la instancia en globalThis para que el Hot Reload no sature PostgreSQL
if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}