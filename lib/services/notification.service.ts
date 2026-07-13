// lib/services/notification.service.ts
import { Resend } from 'resend';

// Asegúrate de tener RESEND_API_KEY en tu .env
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendContactAlert({ message, ip }: { message: string, ip: string }) {
  try {
    await resend.emails.send({
      // 🔴 FIX: Remitente actualizado a tu dominio oficial
      from: 'MEKA_OS <admin@cescjavier.dev>',
      to: 'javiercaiza220158@gmail.com', // Tu correo personal donde recibes la alerta
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
    // Lanzamos el error para que sea capturado por el .catch() en chat.service.ts
    throw error; 
  }
}