// lib/health.ts
// Lógica del "sensor" del portafolio (Next.js), compartida por el endpoint
// /api/health y la página /status. Sanitizada: ok/down + latencia, el detalle
// del error se queda en los logs del servidor.
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

const SENTRA_API = process.env.SENTRA_API_INTERNAL_URL || "http://sentra-api:8000";

// Misma cadena que el chat (lib/services/chat.service.ts): al menos uno debe
// existir en la cuenta Groq o el chat/IA estará caído.
const CHAT_MODELS = [
  process.env.GROQ_CHAT_MODEL,
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
].filter(Boolean) as string[];

export type HealthCheck = {
  name: string;
  status: "ok" | "down";
  critical: boolean;
  latency_ms: number;
  detail: string;
};

export type HealthReport = {
  status: "ok" | "degraded" | "down";
  service: string;
  checks: HealthCheck[];
  config: Record<string, unknown>;
};

async function timed(name: string, critical: boolean, fn: () => Promise<string>): Promise<HealthCheck> {
  const t0 = Date.now();
  try {
    const detail = await fn();
    return { name, status: "ok", critical, latency_ms: Date.now() - t0, detail };
  } catch (e: any) {
    console.error(`[health] ${name} DOWN:`, e?.message || e);
    return { name, status: "down", critical, latency_ms: Date.now() - t0, detail: "unreachable" };
  }
}

async function checkDb(): Promise<string> {
  await prisma.$queryRaw`SELECT 1`;
  return "conectada";
}

async function checkGroq(): Promise<string> {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY ausente");
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 8000, maxRetries: 0 });
  const list = await groq.models.list();
  const ids = new Set(list.data.map((m) => m.id));
  const usable = CHAT_MODELS.find((m) => ids.has(m));
  if (!usable) throw new Error(`ningún modelo de la cadena disponible: ${CHAT_MODELS.join(", ")}`);
  return `${usable} disponible`;
}

async function checkSentraApi(): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(`${SENTRA_API}/health`, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return "alcanzable";
  } finally {
    clearTimeout(timer);
  }
}

function overall(checks: HealthCheck[]): "ok" | "degraded" | "down" {
  if (checks.some((c) => c.status === "down" && c.critical)) return "down";
  if (checks.some((c) => c.status === "down")) return "degraded";
  return "ok";
}

/** Corre los sondeos del portafolio (BD Prisma, Groq del chat, API de Sentra). */
export async function getPortfolioHealth(): Promise<HealthReport> {
  const checks = await Promise.all([
    timed("database", true, checkDb),
    timed("groq", false, checkGroq),
    timed("sentra_api", false, checkSentraApi),
  ]);
  return {
    status: overall(checks),
    service: "portfolio-app",
    checks,
    config: {
      groq_model: process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b (fallback)",
      groq_key_set: !!process.env.GROQ_API_KEY,
    },
  };
}

/** Trae el health detallado de la API de Sentra (Python) por la red interna. */
export async function getSentraHealth(): Promise<HealthReport | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`${SENTRA_API}/api/v1/health`, { signal: ctrl.signal, cache: "no-store" });
    return (await res.json()) as HealthReport;
  } catch (e: any) {
    console.error("[health] no se pudo leer el health de sentra-api:", e?.message || e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
