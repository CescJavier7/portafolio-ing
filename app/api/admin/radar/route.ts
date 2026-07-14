// app/api/admin/radar/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// 🔴 FIX: Anula el caché global agresivo del App Router
export const dynamic = 'force-dynamic';

export async function GET() {
  // 🔴 FIX DE SEGURIDAD: este endpoint exponía TODAS las conversaciones de
  // TODOS los visitantes sin ninguna verificación de sesión. Cualquiera en
  // internet podía leerlas con un simple GET. Ahora exige sesión admin,
  // igual que las server actions en actions.ts.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const sessions = await prisma.chatSession.findMany({
      // 🔴 FIX: mismo filtro que getActiveSessions() en actions.ts, para que
      // la carga inicial (SSR) y el polling (cliente) muestren siempre el
      // mismo conjunto de sesiones, sin parpadeos ni inconsistencias.
      where: {
        status: { in: ['ACTIVE', 'PENDING_REVIEW'] },
      },
      orderBy: { updatedAt: 'desc' },
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