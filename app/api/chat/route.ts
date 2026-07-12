import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validation/chat.schema";
import { handleIncomingMessage } from "@/lib/services/chat.service";
import { isRateLimited, getClientIp } from "@/lib/utils/rateLimit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { limited, retryAfterSeconds } = isRateLimited(ip);

    if (limited) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Espera un momento antes de volver a preguntar." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const rawBody = await req.json();
    const parsed = chatRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos.", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await handleIncomingMessage(parsed.data, ip);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    console.error("=== ERROR ROUTE /api/chat ===", error?.message || error);
    return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
  }
}