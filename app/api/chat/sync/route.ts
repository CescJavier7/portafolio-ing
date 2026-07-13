// app/api/chat/sync/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { sessionId, lastMessageAt } = await req.json();
    if (!sessionId) return NextResponse.json({ error: "No session ID" }, { status: 400 });

    // Buscamos mensajes asociados a la sesión que sean posteriores al último timestamp
    // que tiene el cliente localmente.
    const newMessages = await prisma.message.findMany({
      where: {
        sessionId: sessionId,
        createdAt: {
          gt: new Date(lastMessageAt || 0) 
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Filtramos solo los mensajes emitidos por el administrador o la IA 
    // (el usuario ya tiene sus propios mensajes renderizados en pantalla).
    const incomingMessages = newMessages.filter(msg => msg.role !== 'USER');

    return NextResponse.json({ messages: incomingMessages });
  } catch (error) {
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}