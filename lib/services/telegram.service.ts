// lib/services/telegram.service.ts
export async function sendTelegramAlert(message: string, sessionId: string) {
  // Asegúrate de tener estas variables en tu archivo .env
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_TOKEN || !CHAT_ID) return;

  const text = `🚨 *MEKA_OS // SIGNAL INTERCEPTED*\n\n*Target ID:* \`${sessionId}\`\n*Payload:* "${message}"\n\n[ ACCEDER AL RADAR ](https://cescjavier.dev/meka-admin)`;

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
    console.error("Fallo al enviar telemetría a Telegram", error);
  }
}