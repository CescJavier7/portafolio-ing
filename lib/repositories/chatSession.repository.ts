import { prisma } from "@/lib/prisma";

export interface SentraIdentity {
  userId: string;
  email: string;
}

export async function getSessionById(sessionId: string) {
  return prisma.chatSession.findUnique({
    where: { id: sessionId },
  });
}

export async function createSession(ipAddress: string, sentra?: SentraIdentity) {
  return prisma.chatSession.create({
    data: {
      ipAddress,
      sentraUserId: sentra?.userId,
      sentraEmail: sentra?.email,
    },
  });
}

// Si el frontend aún no tiene sessionId (primera visita), la creamos.
// Si ya tiene uno pero no existe en DB (borrado, expirado, etc.), creamos otra.
export async function findOrCreateSession(
  sessionId: string | undefined,
  ipAddress: string,
  sentra?: SentraIdentity
) {
  if (sessionId) {
    const existing = await getSessionById(sessionId);
    if (existing) {
      // Sesión anónima que ahora chatea logueada: la vinculamos al usuario.
      // Nunca la desvinculamos ni la re-vinculamos a otro usuario (el chat
      // pudo empezar antes del login; el primer dueño identificado se queda).
      if (sentra && !existing.sentraUserId) {
        return prisma.chatSession.update({
          where: { id: existing.id },
          data: { sentraUserId: sentra.userId, sentraEmail: sentra.email },
        });
      }
      return existing;
    }
  }
  return createSession(ipAddress, sentra);
}

export async function setHumanOverride(sessionId: string, value: boolean) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { humanOverride: value },
  });
}

export async function markPendingReview(sessionId: string) {
  return prisma.chatSession.update({
    where: { id: sessionId },
    data: { status: "PENDING_REVIEW" },
  });
}

export async function listSessions(status?: "ACTIVE" | "PENDING_REVIEW" | "CLOSED") {
  return prisma.chatSession.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}