import { NextResponse } from 'next/server';
import { getLesson, type Lang } from '@/lib/academia';
import { verifySentraToken } from '@/lib/sentra/verifyToken.server';

// Sirve el CUERPO de una lección. Las `free` van a cualquiera; las `pro` exigen
// un token de Sentra con plan Pro+ (así el contenido de pago NO se filtra en el
// HTML público — se pide aquí con el token del usuario). Node runtime (lee el .md).
export const dynamic = 'force-dynamic';

const PRO_PLANS = new Set(['PRO', 'TEAM', 'ENTERPRISE']);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const track = searchParams.get('track') ?? '';
  const lessonSlug = searchParams.get('lesson') ?? '';
  const lang = (searchParams.get('lang') === 'en' ? 'en' : 'es') as Lang;

  const lesson = getLesson(track, lessonSlug, lang);
  if (!lesson) {
    return NextResponse.json({ error: 'Lección no encontrada.' }, { status: 404 });
  }

  if (lesson.access === 'pro') {
    const user = await verifySentraToken(req.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ locked: 'auth' }, { status: 401 });
    }
    if (!PRO_PLANS.has(user.plan)) {
      return NextResponse.json({ locked: 'pro' }, { status: 403 });
    }
  }

  return NextResponse.json({
    title: lesson.title,
    access: lesson.access,
    content: lesson.content,
    quiz: lesson.quiz,
  });
}
