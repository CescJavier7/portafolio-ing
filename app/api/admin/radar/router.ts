// app/api/admin/radar/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 🔴 FIX: Anula el caché global agresivo del App Router
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessions = await prisma.chatSession.findMany({
      orderBy: { updatedAt: 'desc' }, // Trae primero las que acaban de hacer PING
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json(sessions, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error("[SYS_ERROR] Radar Telemetry Colapso:", error);
    return NextResponse.json({ error: "Fallo de comunicación interna" }, { status: 500 });
  }
}