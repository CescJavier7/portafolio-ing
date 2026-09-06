// lib/academiaCert.server.ts
//
// Certificados de la Academia: firmados, verificables y SIN base de datos.
//
// Un certificado es un código autocontenido `payload.firma`:
//   · payload → base64url del JSON con lo que se muestra (nombre, track, fecha).
//   · firma   → HMAC-SHA256(payload, secreto del servidor), truncado a 144 bits.
//
// Consecuencias del diseño:
//   · Cualquiera puede VERIFICAR un código (recomputando el HMAC) — por eso la
//     página de verificación es pública.
//   · Nadie puede FALSIFICAR uno sin el secreto, que nunca sale del servidor.
//   · No guardamos nada: no hay tabla que migrar ni datos que filtrar.
//
// PRIVACIDAD: el código es público (se comparte en LinkedIn). Por eso NO lleva
// el id de usuario ni el correo — solo un hash corto y opaco que da unicidad.
import 'server-only';
import crypto from 'node:crypto';

export interface CertPayload {
  v: 1;
  u: string; // hash corto y opaco del usuario (no es el id real)
  n: string; // nombre a mostrar
  t: string; // slug del track
  c: number; // lecciones completadas
  d: string; // fecha de emisión (YYYY-MM-DD)
}

// Reutilizamos el secreto de NextAuth (existe siempre en producción). Se puede
// separar con ACADEMY_CERT_SECRET si algún día se rota por su cuenta.
function secret(): string | null {
  const s = process.env.ACADEMY_CERT_SECRET || process.env.AUTH_SECRET || '';
  return s.length >= 16 ? s : null;
}

const b64u = (b: Buffer) => b.toString('base64url');

function sign(body: string, key: string): string {
  // 18 bytes = 144 bits de firma: de sobra contra falsificación y mantiene el
  // código corto para pegarlo en un perfil.
  return b64u(crypto.createHmac('sha256', key).update(body).digest().subarray(0, 18));
}

/** Hash opaco y estable del usuario (para unicidad sin exponer su id). */
export function subjectHash(userId: string): string {
  return crypto.createHash('sha256').update(`academia:${userId}`).digest('hex').slice(0, 10);
}

/** Firma un certificado. null si el servidor no tiene secreto configurado. */
export function signCertificate(p: CertPayload): string | null {
  const key = secret();
  if (!key) return null;
  const body = b64u(Buffer.from(JSON.stringify(p), 'utf8'));
  return `${body}.${sign(body, key)}`;
}

/** Verifica un código. Devuelve el payload si la firma es válida, o null. */
export function verifyCertificate(code: string): CertPayload | null {
  const key = secret();
  if (!key) return null;

  const raw = String(code ?? '');
  if (raw.length > 2048) return null; // corta entradas absurdas antes de trabajar
  const dot = raw.indexOf('.');
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const givenSig = raw.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(body) || !/^[A-Za-z0-9_-]+$/.test(givenSig)) return null;

  const expected = sign(body, key);
  const a = Buffer.from(givenSig, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  // Comparación en tiempo constante (exige misma longitud).
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      p?.v !== 1 ||
      typeof p.u !== 'string' ||
      typeof p.n !== 'string' ||
      typeof p.t !== 'string' ||
      typeof p.d !== 'string' ||
      typeof p.c !== 'number'
    ) {
      return null;
    }
    return p as CertPayload;
  } catch {
    return null;
  }
}
