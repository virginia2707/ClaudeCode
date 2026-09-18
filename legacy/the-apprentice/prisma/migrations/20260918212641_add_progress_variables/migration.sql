-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentMissionId" TEXT,
    "currentSituationId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "variablesJson" TEXT NOT NULL DEFAULT '{}',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "Progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Progress_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "Simulation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Progress" ("completedAt", "currentMissionId", "currentSituationId", "id", "score", "simulationId", "startedAt", "status", "userId", "xp") SELECT "completedAt", "currentMissionId", "currentSituationId", "id", "score", "simulationId", "startedAt", "status", "userId", "xp" FROM "Progress";
DROP TABLE "Progress";
ALTER TABLE "new_Progress" RENAME TO "Progress";
CREATE UNIQUE INDEX "Progress_userId_simulationId_key" ON "Progress"("userId", "simulationId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
