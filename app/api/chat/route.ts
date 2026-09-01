import { NextResponse } from "next/server";
import { chatRequestSchema } from "@/lib/validation/chat.schema";
import { handleIncomingMessage } from "@/lib/services/chat.service";
import { isRateLimited, getClientIp } from "@/lib/utils/rateLimit";
import { verifySentraToken } from "@/lib/sentra/verifyToken.server";

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

    // Si el visitante está logueado en Sentra, el cliente manda su access
    // token y la sesión de chat queda vinculada a su cuenta. Best-effort:
    // un token inválido degrada a chat anónimo, nunca a error.
    const sentraUser = await verifySentraToken(req.headers.get("authorization"));

    const result = await handleIncomingMessage(parsed.data, ip, sentraUser ?? undefined);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    const detail = error?.message ?? String(error);
    console.error("=== ERROR ROUTE /api/chat ===", detail);
    // 400 (no 5xx): Cloudflare borra el cuerpo de los 5xx → el cliente no podría
    // leer el motivo. Con 4xx el JSON con `detail` sí llega.
    return NextResponse.json({ error: "Error interno del servidor.", detail: String(detail).slice(0, 200) }, { status: 400 });
  }
}