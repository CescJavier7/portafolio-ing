'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Extrae las sesiones activas o pendientes de revisión
export async function getActiveSessions() {
  const session = await auth();
  if (!session?.user) throw new Error("Acceso no autorizado al kernel.");

  // Se consulta la base de datos buscando sesiones con estados específicos
  return await prisma.chatSession.findMany({
    where: {
      status: { in: ['ACTIVE', 'PENDING_REVIEW'] } 
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' } // Extraemos todo el contexto cronológico
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

// Alterna el protocolo de intercepción en la base de datos
export async function toggleHumanOverrideAction(sessionId: string, newOverrideState: boolean) {
  const session = await auth();
  if (!session?.user) throw new Error("Acceso no autorizado al kernel.");

  try {
    // Se actualiza el campo humanOverride en la base de datos[cite: 1]
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { humanOverride: newOverrideState } 
    });
    
    // Purgamos la caché de la ruta para refrescar SSR
    revalidatePath('/meka-admin');
    return { success: true };
  } catch (error) {
    console.error("SYS_OVERRIDE_ERROR:", error);
    return { success: false, error: "Fallo de conexión con la base de datos." };
  }
}

// app/meka-admin/actions.ts (Añadir al final)

export async function sendAdminReply(sessionId: string, content: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Acceso denegado al kernel.");

  if (!content || content.trim() === '') return { success: false, error: "Empty payload" };

  try {
    // 1. Insertamos el mensaje como ADMIN
    await prisma.message.create({
      data: {
        sessionId,
        role: 'ADMIN',
        content: content.trim()
      }
    });

    // 2. Actualizamos el timestamp de la sesión para mantenerla arriba en el radar
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    });

    revalidatePath('/meka-admin');
    return { success: true };
  } catch (error) {
    console.error("SYS_REPLY_ERROR:", error);
    return { success: false, error: "Fallo de inyección en la base de datos." };
  }
}