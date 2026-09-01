// lib/groqModels.ts
// Fuente ÚNICA de la cadena de modelos Groq (con fallback) para TODO el lado
// Next.js: chatbot, reporte IA de Sentra y el sensor /status. Groq decomisiona
// modelos seguido (llama-3.1-8b, llama-3.3-70b → 404 model_not_found); tener una
// sola lista evita que un camino quede con un modelo muerto hardcodeado.
// Modelos verificados en la cuenta: openai/gpt-oss-*, qwen. `GROQ_CHAT_MODEL`
// (env) manda. Ver `curl api.groq.com/openai/v1/models`.
import type Groq from 'groq-sdk';

export function groqModelChain(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of [process.env.GROQ_CHAT_MODEL, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']) {
    if (m && !seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

/** ¿El error de Groq es "modelo inexistente/decomisionado" (→ probar el siguiente)? */
export function isModelGoneError(err: any): boolean {
  const status = err?.status ?? err?.statusCode;
  const code = err?.error?.code ?? err?.code;
  const msg = String(err?.error?.message ?? err?.message ?? err ?? '').toLowerCase();
  return (
    status === 404 ||
    code === 'model_not_found' ||
    code === 'model_decommissioned' ||
    msg.includes('does not exist') ||
    msg.includes('decommission')
  );
}

/**
 * `chat.completions.create` con FALLBACK de modelo: prueba la cadena en orden y,
 * si un modelo no existe (404), salta al siguiente. Ante otros errores (401/429/
 * timeout) NO cambia de modelo y propaga. Devuelve la completion y el modelo usado.
 */
export async function groqChatWithFallback(groq: Groq, params: any): Promise<{ completion: any; model: string }> {
  let lastErr: any = null;
  for (const model of groqModelChain()) {
    try {
      const completion = await groq.chat.completions.create({ ...params, model });
      return { completion, model };
    } catch (err: any) {
      lastErr = err;
      console.error(`[groq] modelo '${model}' falló:`, err?.error?.message ?? err?.message ?? err);
      if (!isModelGoneError(err)) break;
    }
  }
  throw lastErr ?? new Error('Groq: ningún modelo disponible en la cuenta');
}
