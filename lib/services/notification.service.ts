import { Resend } from "resend";

interface ContactAlertParams {
  message: string;
  ip: string;
}

export async function sendContactAlert({ message, ip }: ContactAlertParams) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY no detectada. Notificación omitida.");
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "MekaSenku OS <onboarding@resend.dev>",
      to: "javiercaiza220158@gmail.com",
      subject: "🚨 ¡Un reclutador quiere contactarte!",
      html: `
        <div style="font-family: monospace; background-color: #000; color: #0f0; padding: 20px; border-radius: 5px;">
          <h2 style="color: #fff;">MEKA_JAVIER_OS // Alerta de Interacción</h2>
          <p>Se ha detectado una intención de contacto directo en el portafolio.</p>
          <hr style="border-color: #0f03;">
          <p><strong>Mensaje del usuario:</strong> "${message}"</p>
          <p><strong>IP de origen:</strong> ${ip}</p>
          <hr style="border-color: #0f03;">
          <p>Prepárate para tomar el control del sistema. E=mc²</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Error al disparar el webhook de correo:", emailError);
    // No detenemos la ejecución si el correo falla, la UI debe seguir funcionando.
  }
}