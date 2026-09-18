-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EscapeGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'BUREAUTIQUE',
    "level" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 45,
    "objective" TEXT NOT NULL DEFAULT '',
    "targetSkills" TEXT NOT NULL DEFAULT '[]',
    "scenario" TEXT NOT NULL DEFAULT '',
    "introduction" TEXT NOT NULL DEFAULT '',
    "finalMessage" TEXT NOT NULL DEFAULT '',
    "coverImageUrl" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "maxParticipants" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EscapeGame_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EscapeGame_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EscapeGame" ("archivedAt", "category", "coverImageUrl", "createdAt", "description", "difficulty", "estimatedMinutes", "finalMessage", "id", "introduction", "isDemo", "level", "maxParticipants", "mode", "objective", "organizationId", "ownerId", "publishedAt", "scenario", "slug", "status", "title", "updatedAt", "version") SELECT "archivedAt", "category", "coverImageUrl", "createdAt", "description", "difficulty", "estimatedMinutes", "finalMessage", "id", "introduction", "isDemo", "level", "maxParticipants", "mode", "objective", "organizationId", "ownerId", "publishedAt", "scenario", "slug", "status", "title", "updatedAt", "version" FROM "EscapeGame";
DROP TABLE "EscapeGame";
ALTER TABLE "new_EscapeGame" RENAME TO "EscapeGame";
CREATE UNIQUE INDEX "EscapeGame_slug_key" ON "EscapeGame"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
