// lib/sentra/verifyToken.server.ts
//
// Validación SERVER-SIDE de un access token de Sentra: el Next.js no
// conoce el JWT_SECRET de la API (a propósito — un solo dueño del secreto),
// así que delega la verificación en GET /auth/me del propio servicio.
// En el VPS usa la red interna de Docker (http://sentra-api:8000) vía
// SENTRA_API_INTERNAL_URL: sin salir a internet ni pasar por Cloudflare.
import 'server-only';

const INTERNAL_API =
  process.env.SENTRA_API_INTERNAL_URL ?? 'https://api.cescjavier.dev';

export interface VerifiedSentraUser {
  userId: string;
  email: string;
  plan: string;
  name: string | null;
}

// Best-effort: si el token es inválido/expiró o la API no responde,
// devolvemos null y el chat sigue funcionando como anónimo. Identificar
// al usuario es un extra, nunca un motivo para romper el chat.
export async function verifySentraToken(
  authorizationHeader: string | null,
): Promise<VerifiedSentraUser | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;

  try {
    const res = await fetch(`${INTERNAL_API}/api/v1/auth/me`, {
      headers: { Authorization: authorizationHeader },
      // El token expira en 15 min: no queremos cachear un "me" viejo.
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const user = await res.json();
    if (typeof user?.id !== 'string' || typeof user?.email !== 'string') return null;

    return {
      userId: user.id,
      email: user.email,
      plan: user.plan ?? 'FREE',
      name: typeof user.name === 'string' && user.name.trim() ? user.name.trim() : null,
    };
  } catch {
    return null;
  }
}
