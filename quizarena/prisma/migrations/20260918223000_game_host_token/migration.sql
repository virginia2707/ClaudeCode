-- AlterTable
ALTER TABLE "Game" ADD COLUMN "hostToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Game_hostToken_key" ON "Game"("hostToken");

