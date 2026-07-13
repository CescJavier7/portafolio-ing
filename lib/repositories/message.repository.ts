// lib/repositories/message.repository.ts
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export async function saveMessage(sessionId: string, role: Role, content: string) {
  // 1. Guardamos el mensaje
  const message = await prisma.message.create({
    data: { sessionId, role, content },
  });

  // 2. 🔴 FIX: Actualizamos la sesión padre para que suba a la cima del RadarDashboard
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() }
  });

  return message;
}

export async function getMessagesBySession(sessionId: string) {
  return prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
}