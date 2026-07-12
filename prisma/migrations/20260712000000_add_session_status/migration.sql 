-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PENDING_REVIEW', 'CLOSED');

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "ChatSession_status_updatedAt_idx" ON "ChatSession"("status", "updatedAt");