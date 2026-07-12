import { prisma } from "@/lib/prisma";

export async function getSessionById(sessionId: string) {
  return prisma.chatSession.findUnique({
    where: { id: sessionId },
  });
}

export async function createSession(ipAddress: string) {
  return prisma.chatSession.create({
    data: { ipAddress },
  });
}

// Si el frontend aún no tiene sessionId (primera visita), la creamos.
// Si ya tiene uno pero no existe en DB (borrado, expirado, etc.), creamos otra.
export async function findOrCreateSession(sessionId: string | undefined, ipAddress: string) {
  if (sessionId) {
    const existing = await getSessionById(sessionId);
    if (existing) return existing;
  }
  return createSession(ipAddress);
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