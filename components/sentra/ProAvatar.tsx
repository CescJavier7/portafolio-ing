'use client';

// Avatar con la inicial del correo. Para usuarios Pro, un anillo dorado
// con brillo (estilo "Gemini Pro"): distingue visualmente la cuenta premium.
export default function ProAvatar({
  email,
  plan,
  size = 32,
}: {
  email: string;
  plan: string;
  size?: number;
}) {
  const initial = email.charAt(0).toUpperCase();
  const isPro = plan === 'PRO' || plan === 'TEAM' || plan === 'ENTERPRISE';
  const inner = Math.round(size * 0.86);

  if (!isPro) {
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.44 }}
        className="rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-black font-black flex items-center justify-center"
      >
        {initial}
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className="relative rounded-full flex items-center justify-center bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 shadow-[0_0_12px_rgba(245,181,11,0.55)]"
    >
      {/* Núcleo oscuro para que la inicial resalte sobre el anillo dorado */}
      <span
        style={{ width: inner, height: inner, fontSize: size * 0.42 }}
        className="rounded-full bg-zinc-900 text-amber-300 font-black flex items-center justify-center"
      >
        {initial}
      </span>
    </span>
  );
}
