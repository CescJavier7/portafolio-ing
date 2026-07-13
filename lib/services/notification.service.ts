import { Resend } from 'resend';

export async function sendContactAlert({ message, ip }: { message: string, ip: string }) {
  // 🔴 FIX: Lazy Instantiation. Evita que Vercel evalúe la llave durante el 'npm run build'
  const apiKey = process.env.RESEND_API_KEY || 're_dummy_key_for_build';
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      // 🔴 FIX: Tu dominio oficial (Asegúrate de que Cloudflare ya lo haya propagado)
      from: 'MEKA_OS <admin@cescjavier.dev>',
      to: 'javiercaiza220158@gmail.com',
      subject: '🚨 MEKA_JAVIER_OS // Alerta de Interacción',
      html: `
        <div style="background-color: #000; color: #22c55e; padding: 20px; font-family: monospace;">
          <h2>MEKA_JAVIER_OS // Alerta de Interacción</h2>
          <p>Se ha detectado una intención de contacto directo en el portafolio.</p>
          <p><strong>Mensaje del usuario:</strong> "${message}"</p>
          <p><strong>IP de origen:</strong> ${ip}</p>
          <p>Prepárate para tomar el control del sistema. E=mc²</p>
        </div>
      `
    });
  } catch (error) {
    console.error("[SYS_ERROR] Fallo al enviar correo vía Resend:", error);
    throw error; 
  }
}