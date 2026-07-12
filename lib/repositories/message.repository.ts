import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export async function saveMessage(sessionId: string, role: Role, content: string) {
  return prisma.message.create({
    data: { sessionId, role, content },
  });
}

export async function getMessagesBySession(sessionId: string) {
  return prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
}