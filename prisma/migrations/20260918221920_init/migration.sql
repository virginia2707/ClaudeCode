-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TRAINER',
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "logoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TRAINER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EscapeGame" (
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

-- CreateTable
CREATE TABLE "GameSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "timerMode" TEXT NOT NULL DEFAULT 'GLOBAL',
    "maxMinutes" INTEGER DEFAULT 45,
    "pauseAllowed" BOOLEAN NOT NULL DEFAULT true,
    "endOnTimeout" BOOLEAN NOT NULL DEFAULT true,
    "basePoints" INTEGER NOT NULL DEFAULT 100,
    "timeBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "timeBonusMax" INTEGER NOT NULL DEFAULT 50,
    "noHintBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "noHintBonus" INTEGER NOT NULL DEFAULT 20,
    "streakBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "streakBonus" INTEGER NOT NULL DEFAULT 10,
    "hintPenaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wrongAnswerPenalty" INTEGER NOT NULL DEFAULT 0,
    "timeoutPenalty" INTEGER NOT NULL DEFAULT 0,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardMethod" TEXT NOT NULL DEFAULT 'PEDAGOGICAL',
    "showLiveRanking" BOOLEAN NOT NULL DEFAULT true,
    "soundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "musicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "animationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "themeKey" TEXT NOT NULL DEFAULT 'mission',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameSetting_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EscapeGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instruction" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "videoUrl" TEXT,
    "unlockCode" TEXT,
    "unlockConditions" TEXT NOT NULL DEFAULT '{"all":[{"type":"previous_step"}]}',
    "points" INTEGER NOT NULL DEFAULT 100,
    "recommendedSeconds" INTEGER NOT NULL DEFAULT 480,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "successFeedback" TEXT NOT NULL DEFAULT '',
    "errorFeedback" TEXT NOT NULL DEFAULT '',
    "explanation" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameStep_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EscapeGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'SHORT_ANSWER',
    "prompt" TEXT NOT NULL DEFAULT '',
    "config" TEXT NOT NULL DEFAULT '{}',
    "validationMode" TEXT NOT NULL DEFAULT 'AUTO',
    "maxAttempts" INTEGER,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "accentSensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Puzzle_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "GameStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puzzleId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Answer_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puzzleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "pointCost" INTEGER NOT NULL DEFAULT 10,
    "timeCostSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hint_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Skill_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PuzzleSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "puzzleId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "PuzzleSkill_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "Puzzle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PuzzleSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "mode" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "gameSnapshot" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "startedAt" DATETIME,
    "pausedAt" DATETIME,
    "pausedTotalSeconds" INTEGER NOT NULL DEFAULT 0,
    "extendedSeconds" INTEGER NOT NULL DEFAULT 0,
    "endedAt" DATETIME,
    "endReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GameSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EscapeGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionPlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "connection" TEXT NOT NULL DEFAULT 'ONLINE',
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#5eead4',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SessionPlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL DEFAULT 'PLAYER',
    "playerId" TEXT,
    "teamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "currentStepId" TEXT,
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

-- CreateTable
CREATE TABLE "PlayerAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "playerId" TEXT,
    "stepId" TEXT NOT NULL,
    "submitted" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AUTO',
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "timeTakenSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerAnswer_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "PlayerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerAnswer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SessionPlayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlayerAnswer_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "GameStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoreEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "stepId" TEXT,
    "type" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreEvent_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "PlayerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoreEvent_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "GameStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HintRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "playerId" TEXT,
    "hintId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL DEFAULT 'PLAYER',
    "pointCost" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HintRequest_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "PlayerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HintRequest_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SessionPlayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "HintRequest_hintId_fkey" FOREIGN KEY ("hintId") REFERENCES "Hint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'trophy',
    "ruleType" TEXT NOT NULL,
    "ruleConfig" TEXT NOT NULL DEFAULT '{}',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "gameId" TEXT,
    "ownerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EscapeGame" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Badge_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerBadge_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "PlayerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER,
    "timeSpentSeconds" INTEGER NOT NULL,
    "stepsCompleted" INTEGER NOT NULL,
    "stepsTotal" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL,
    "wrongAnswers" INTEGER NOT NULL,
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameResult_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "PlayerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "gameId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'stub',
    "input" TEXT NOT NULL,
    "output" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AIJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIJob_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EscapeGame" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "gameId" TEXT,
    "sessionId" TEXT,
    "actorId" TEXT,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EscapeGame" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EscapeGame_slug_key" ON "EscapeGame"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GameSetting_gameId_key" ON "GameSetting"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameStep_gameId_order_key" ON "GameStep"("gameId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_stepId_key" ON "Puzzle"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "Hint_puzzleId_order_key" ON "Hint"("puzzleId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_ownerId_name_key" ON "Skill"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PuzzleSkill_puzzleId_skillId_key" ON "PuzzleSkill"("puzzleId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_code_key" ON "GameSession"("code");

-- CreateIndex
CREATE UNIQUE INDEX "SessionPlayer_sessionId_displayName_key" ON "SessionPlayer"("sessionId", "displayName");

-- CreateIndex
CREATE UNIQUE INDEX "Team_sessionId_name_key" ON "Team"("sessionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_playerId_key" ON "TeamMember"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProgress_playerId_key" ON "PlayerProgress"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProgress_teamId_key" ON "PlayerProgress"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "HintRequest_progressId_hintId_key" ON "HintRequest"("progressId", "hintId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_gameId_code_key" ON "Badge"("gameId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBadge_progressId_badgeId_key" ON "PlayerBadge"("progressId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "GameResult_progressId_key" ON "GameResult"("progressId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_storedName_key" ON "Upload"("storedName");
