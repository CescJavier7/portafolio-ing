// Ruta exacta: app/api/admin/radar/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Extraemos TODAS las sesiones, ordenadas por el último mensaje recibido
    const sessions = await prisma.chatSession.findMany({
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json(sessions, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
      }
    });
  } catch (error) {
    console.error("[RADAR_ERROR]:", error);
    return NextResponse.json({ error: "Falla de escaneo en el radar central" }, { status: 500 });
  }
}