// app/api/chat/sync/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🔴 DIRECTIVA CRÍTICA: Desactiva el caché estático de Next.js App Router
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: "Missing Target ID" }, { status: 400 });
    }

    // Buscamos la fuente de la verdad absoluta
    const newMessages = await prisma.message.findMany({
      where: { sessionId: sessionId },
      orderBy: { createdAt: 'asc' }
    });

    // Filtramos los del usuario, solo enviamos AI y ADMIN
    const incomingMessages = newMessages.filter(msg => msg.role !== 'USER');

    // 🔴 Cabeceras defensivas para evitar que el navegador guarde la respuesta
    return NextResponse.json({ messages: incomingMessages }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error("[SYNC_ERROR]:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}