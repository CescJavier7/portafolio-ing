// lib/services/telegram.service.ts
export async function sendSmartAlert(message: string, sessionId: string, isFirstMessage: boolean) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_TOKEN || !CHAT_ID) return;

  const highValueKeywords = ['precio', 'costo', 'cotización', 'contratar', 'reunión', 'entrevista', 'contacto', 'servicios', 'trabajo'];
  const isHighValue = highValueKeywords.some(kw => message.toLowerCase().includes(kw));

  // Bloqueo Anti-Spam: Notificamos solo en leads nuevos o intenciones de negocio
  if (!isFirstMessage && !isHighValue) return;

  const triggerReason = isFirstMessage ? "🟢 NUEVO VISITANTE EN EL RADAR" : "💰 INTENCIÓN DE NEGOCIO DETECTADA";
  const text = `🚨 *MEKA_OS // SIGNAL INTERCEPTED*\n\n*Alerta:* ${triggerReason}\n*Target ID:* \`${sessionId}\`\n*Payload:* "${message}"\n\n[ ACCEDER AL CENTRO DE MANDO ](https://cescjavier.dev/meka-admin)`;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: text,
        parse_mode: 'Markdown'
      }),
    });
  } catch (error) {
    console.error("[SYS_ERROR] Fallo de infraestructura en Telegram C2:", error);
  }
}