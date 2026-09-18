-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PlayerProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL DEFAULT 'PLAYER',
    "playerId" TEXT,
    "teamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "currentStepId" TEXT,
    "trainerUnlocks" TEXT NOT NULL DEFAULT '[]',
    "unlockedCodes" TEXT NOT NULL DEFAULT '[]',
    "stepStates" TEXT NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "stepsCompleted" INTEGER NOT NULL DEFAULT 0,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SessionPlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerProgress_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PlayerProgress" ("actorType", "completedAt", "currentStepId", "hintsUsed", "id", "playerId", "score", "sessionId", "startedAt", "status", "stepStates", "stepsCompleted", "streak", "teamId", "timeSpentSeconds", "updatedAt", "wrongAnswers") SELECT "actorType", "completedAt", "currentStepId", "hintsUsed", "id", "playerId", "score", "sessionId", "startedAt", "status", "stepStates", "stepsCompleted", "streak", "teamId", "timeSpentSeconds", "updatedAt", "wrongAnswers" FROM "PlayerProgress";
DROP TABLE "PlayerProgress";
ALTER TABLE "new_PlayerProgress" RENAME TO "PlayerProgress";
CREATE UNIQUE INDEX "PlayerProgress_playerId_key" ON "PlayerProgress"("playerId");
CREATE UNIQUE INDEX "PlayerProgress_teamId_key" ON "PlayerProgress"("teamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
