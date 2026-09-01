import type { Metadata } from "next";
import { getPortfolioHealth, getSentraHealth, type HealthReport } from "@/lib/health";

// Página del "sensor": tablero de estado en vivo de todo el stack (portafolio +
// Sentra). Server component → sondea al renderizar; nunca cachea. noindex: es una
// herramienta operativa, no contenido.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estado del sistema",
  robots: { index: false, follow: false },
};

const STATUS_UI: Record<string, { dot: string; text: string; label: (en: boolean) => string }> = {
  ok: { dot: "bg-green-500", text: "text-green-600 dark:text-green-400", label: (en) => (en ? "Operational" : "Operativo") },
  degraded: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400", label: (en) => (en ? "Degraded" : "Degradado") },
  down: { dot: "bg-red-500", text: "text-red-600 dark:text-red-400", label: (en) => (en ? "Down" : "Caído") },
};

function ServiceCard({ report, title, en }: { report: HealthReport | null; title: string; en: boolean }) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-zinc-900 dark:text-white">{title}</h2>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {en ? "Unreachable" : "Inalcanzable"}
          </span>
        </div>
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-2">
          {en ? "Could not read this service's health." : "No se pudo leer el estado de este servicio."}
        </p>
      </div>
    );
  }
  const s = STATUS_UI[report.status] ?? STATUS_UI.down;
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-zinc-900 dark:text-white">{title}</h2>
        <span className={`inline-flex items-center gap-2 text-sm font-bold ${s.text}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} /> {s.label(en)}
        </span>
      </div>
      <ul className="space-y-2">
        {report.checks.map((c) => {
          const cs = STATUS_UI[c.status === "ok" ? "ok" : "down"];
          return (
            <li key={c.name} className="flex items-center gap-3 text-[13px]">
              <span className={`w-2 h-2 rounded-full shrink-0 ${cs.dot}`} />
              <span className="font-semibold text-zinc-700 dark:text-zinc-200 w-28 capitalize">{c.name.replace("_", " ")}</span>
              <span className={cs.text}>{c.status === "ok" ? "ok" : (en ? "down" : "caído")}</span>
              {c.critical && c.status !== "ok" && (
                <span className="text-[10px] font-bold uppercase text-red-500">{en ? "critical" : "crítico"}</span>
              )}
              <span className="ml-auto tabular-nums text-zinc-400">{c.latency_ms} ms</span>
            </li>
          );
        })}
      </ul>
      {report.config && (
        <p className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-400">
          {en ? "Model" : "Modelo"}: {String(report.config.groq_model ?? "—")} · Groq key: {report.config.groq_key_set ? "✓" : "✗"}
        </p>
      )}
    </div>
  );
}

export default async function StatusPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const en = lang === "en";

  const [portfolio, sentra] = await Promise.all([
    getPortfolioHealth().catch(() => null),
    getSentraHealth(),
  ]);

  const worst = [portfolio?.status, sentra?.status].includes("down")
    ? "down"
    : [portfolio?.status, sentra?.status].includes("degraded") || !sentra
    ? "degraded"
    : "ok";
  const top = STATUS_UI[worst] ?? STATUS_UI.down;

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-28 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className={`w-3 h-3 rounded-full ${top.dot} animate-pulse`} />
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            {en ? "System status" : "Estado del sistema"}
          </h1>
        </div>
        <p className={`text-sm font-bold mb-1 ${top.text}`}>{top.label(en)}</p>
        <p className="text-[12px] text-zinc-400 mb-8">
          {en ? "Live check · " : "Verificación en vivo · "}
          {new Date().toLocaleString(en ? "en-US" : "es-EC", { timeZone: "America/Guayaquil" })}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <ServiceCard report={portfolio} title="Portafolio (Next.js)" en={en} />
          <ServiceCard report={sentra} title="Sentra API (FastAPI)" en={en} />
        </div>

        <p className="text-[12px] text-zinc-400 mt-8 leading-relaxed">
          {en
            ? "Each component is probed on load (DB, Redis, Groq LLM, inter-service link). Green = ok, amber = degraded (non-critical down), red = a critical dependency is down."
            : "Cada componente se sondea al cargar (BD, Redis, Groq, enlace entre servicios). Verde = ok, ámbar = degradado (cayó algo no crítico), rojo = una dependencia crítica está caída."}
        </p>
      </div>
    </div>
  );
}
