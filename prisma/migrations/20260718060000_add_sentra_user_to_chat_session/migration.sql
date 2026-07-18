-- Vincula sesiones de chat de MekaSenku con usuarios registrados de Sentra.
-- Columnas sueltas (no FK): los usuarios viven en otra base (servicio FastAPI).
ALTER TABLE "ChatSession" ADD COLUMN "sentraUserId" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "sentraEmail" TEXT;

CREATE INDEX "ChatSession_sentraUserId_idx" ON "ChatSession"("sentraUserId");
