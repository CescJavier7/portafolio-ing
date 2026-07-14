// app/api/chat/sync/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: "Missing Target ID" }, { status: 400 });
    }

    // 🔴 FIX: traemos también el estado actual de humanOverride de la sesión.
    // Esto permite que el frontend detecte cuando el admin LIBERA el control
    // sin haber mandado ningún mensaje nuevo — antes esto dejaba al visitante
    // con el mensaje de "esperando" colgado para siempre.
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { humanOverride: true },
    });

    const newMessages = await prisma.message.findMany({
      where: { sessionId: sessionId },
      orderBy: { createdAt: 'asc' }
    });

    const incomingMessages = newMessages.filter(msg => msg.role !== 'USER');

    return NextResponse.json(
      {
        messages: incomingMessages,
        humanOverride: session?.humanOverride ?? false,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
        }
      }
    );
  } catch (error) {
    console.error("[SYNC_ERROR]:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}