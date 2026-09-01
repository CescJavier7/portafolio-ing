import { NextResponse } from "next/server";
import { getPortfolioHealth } from "@/lib/health";

// El "sensor" del portafolio (Next.js): BD (Prisma), Groq (chat) y la API de
// Sentra. Sanitizado y siempre en vivo. 503 solo si algo CRÍTICO cae (así
// Cloudflare no rompe los 200 de ok/degraded). Lógica en lib/health.ts.
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getPortfolioHealth();
  return NextResponse.json(report, { status: report.status === "down" ? 503 : 200 });
}
