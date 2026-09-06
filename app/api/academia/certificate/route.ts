import { NextResponse } from 'next/server';
import { getTrackLessons, getTrackMeta, type Lang } from '@/lib/academia';
import { verifySentraToken } from '@/lib/sentra/verifyToken.server';
import { signCertificate, verifyCertificate, subjectHash } from '@/lib/academiaCert.server';

// Certificado de finalización de un track.
//
//  POST → EMITE. La verdad del currículo vive aquí (los .md), y la verdad del
//         progreso en Sentra: este endpoint cruza ambas con el token del
//         usuario. El cliente NUNCA decide si completó (no manda la lista de
//         lecciones): se lee del disco y se compara con el progreso real.
//  GET  → VERIFICA un código (público, sin sesión): recomputa el HMAC.
//
// Los errores van en 4xx a propósito: Cloudflare se come el cuerpo de los 5xx
// y el `detail` nunca llegaría al navegador.
export const dynamic = 'force-dynamic';

const INTERNAL_API = process.env.SENTRA_API_INTERNAL_URL ?? 'https://api.cescjavier.dev';
const MAX_NAME = 60;

function displayName(name: string | null, email: string): string {
  const n = (name ?? '').trim();
  if (n) return n.slice(0, MAX_NAME);
  // Sin nombre: la parte local del correo, saneada (nunca el correo completo).
  return (email.split('@')[0] ?? 'Estudiante').slice(0, MAX_NAME);
}

export async function POST(req: Request) {
  let body: { track?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: 'Cuerpo inválido.' }, { status: 400 });
  }

  const track = String(body.track ?? '');
  const lang = (body.lang === 'en' ? 'en' : 'es') as Lang;
  const en = lang === 'en';

  const meta = getTrackMeta(track);
  if (!meta) return NextResponse.json({ detail: 'Ruta no encontrada.' }, { status: 404 });

  const user = await verifySentraToken(req.headers.get('authorization'));
  if (!user) {
    return NextResponse.json({ locked: 'auth', detail: 'Sesión requerida.' }, { status: 401 });
  }

  const lessons = getTrackLessons(track, lang);
  if (lessons.length === 0) {
    return NextResponse.json(
      { detail: en ? 'This track has no content yet.' : 'Esta ruta aún no tiene contenido.' },
      { status: 400 },
    );
  }

  // Progreso real del usuario, con SU token (anti-IDOR: la API solo devuelve el suyo).
  let completed: string[] = [];
  try {
    const res = await fetch(`${INTERNAL_API}/api/v1/academy/progress`, {
      headers: { Authorization: req.headers.get('authorization') ?? '' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json({ detail: 'No se pudo leer tu progreso.' }, { status: 400 });
    }
    const data = await res.json();
    completed = Array.isArray(data?.completed) ? data.completed.map(String) : [];
  } catch {
    return NextResponse.json({ detail: 'No se pudo leer tu progreso.' }, { status: 400 });
  }

  const done = new Set(completed);
  const missing = lessons.filter((l) => !done.has(`${track}/${l.slug}`));
  if (missing.length > 0) {
    return NextResponse.json(
      {
        locked: 'incomplete',
        missing: missing.length,
        total: lessons.length,
        detail: en
          ? `You still have ${missing.length} of ${lessons.length} lessons to complete.`
          : `Te faltan ${missing.length} de ${lessons.length} lecciones.`,
      },
      { status: 403 },
    );
  }

  const issued = new Date().toISOString().slice(0, 10);
  const name = displayName(user.name, user.email);
  const code = signCertificate({
    v: 1,
    u: subjectHash(user.userId),
    n: name,
    t: track,
    c: lessons.length,
    d: issued,
  });
  if (!code) {
    // Falta el secreto del servidor: es un fallo de configuración, pero se
    // devuelve 4xx para que el motivo sobreviva a Cloudflare.
    return NextResponse.json({ detail: 'Certificados no disponibles (configuración).' }, { status: 400 });
  }

  return NextResponse.json({
    code,
    name,
    track,
    title: meta.title[lang],
    lessons: lessons.length,
    date: issued,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') ?? '';
  const lang = (searchParams.get('lang') === 'en' ? 'en' : 'es') as Lang;

  const p = verifyCertificate(code);
  if (!p) return NextResponse.json({ valid: false }, { status: 404 });

  const meta = getTrackMeta(p.t);
  return NextResponse.json({
    valid: true,
    name: p.n,
    track: p.t,
    title: meta?.title[lang] ?? p.t,
    lessons: p.c,
    date: p.d,
  });
}
