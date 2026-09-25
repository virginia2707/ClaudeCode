-- CreateIndex
CREATE INDEX "AIJob_ownerId_createdAt_idx" ON "AIJob"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "EscapeGame_ownerId_status_updatedAt_idx" ON "EscapeGame"("ownerId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "EscapeGame_organizationId_idx" ON "EscapeGame"("organizationId");

-- CreateIndex
CREATE INDEX "GameSession_hostId_createdAt_idx" ON "GameSession"("hostId", "createdAt");

-- CreateIndex
CREATE INDEX "GameSession_gameId_createdAt_idx" ON "GameSession"("gameId", "createdAt");

-- CreateIndex
CREATE INDEX "GameSession_status_idx" ON "GameSession"("status");

-- CreateIndex
CREATE INDEX "GameStep_gameId_idx" ON "GameStep"("gameId");

-- CreateIndex
CREATE INDEX "PlayerAnswer_progressId_createdAt_idx" ON "PlayerAnswer"("progressId", "createdAt");

-- CreateIndex
CREATE INDEX "PlayerAnswer_stepId_idx" ON "PlayerAnswer"("stepId");

-- CreateIndex
CREATE INDEX "PlayerAnswer_status_idx" ON "PlayerAnswer"("status");

-- CreateIndex
CREATE INDEX "PlayerProgress_sessionId_status_idx" ON "PlayerProgress"("sessionId", "status");

-- CreateIndex
CREATE INDEX "ScoreEvent_progressId_idx" ON "ScoreEvent"("progressId");

-- CreateIndex
CREATE INDEX "SessionPlayer_sessionId_lastSeenAt_idx" ON "SessionPlayer"("sessionId", "lastSeenAt");
