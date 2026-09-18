-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
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
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sessionId" TEXT,
    "invitedById" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "acceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Skill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sector" TEXT,
    "jobTitle" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "mode" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "objectivesJson" TEXT NOT NULL DEFAULT '[]',
    "expectedOutcome" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceImportId" TEXT,
    "duplicatedFromId" TEXT,
    "scoringMode" TEXT NOT NULL DEFAULT 'SCORE_AND_SKILLS',
    "scoringConfigJson" TEXT NOT NULL DEFAULT '{}',
    "coachEnabled" BOOLEAN NOT NULL DEFAULT true,
    "coachConfigJson" TEXT NOT NULL DEFAULT '{}',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Mission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Mission_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Mission_sourceImportId_fkey" FOREIGN KEY ("sourceImportId") REFERENCES "CourseImport" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "setting" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '',
    "problem" TEXT NOT NULL DEFAULT '',
    "stakes" TEXT NOT NULL DEFAULT '',
    "timeframe" TEXT NOT NULL DEFAULT '',
    "briefing" TEXT NOT NULL DEFAULT '',
    "openingMessage" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "Scenario_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnerRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "seniority" TEXT NOT NULL DEFAULT '',
    "reportsTo" TEXT NOT NULL DEFAULT '',
    "responsibilities" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "LearnerRole_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Constraint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'MAX',
    "value" REAL,
    "unit" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Constraint_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL DEFAULT '',
    "instruction" TEXT NOT NULL DEFAULT '',
    "stepType" TEXT NOT NULL DEFAULT 'ANALYSIS',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 10,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockRuleJson" TEXT NOT NULL DEFAULT '{}',
    "maxScore" INTEGER NOT NULL DEFAULT 20,
    "successCriteria" TEXT NOT NULL DEFAULT '',
    "feedbackSuccess" TEXT NOT NULL DEFAULT '',
    "feedbackPartial" TEXT NOT NULL DEFAULT '',
    "feedbackFailure" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MissionStep_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "answerKeyJson" TEXT NOT NULL DEFAULT '{}',
    "autoGrade" BOOLEAN NOT NULL DEFAULT false,
    "maxScore" INTEGER NOT NULL DEFAULT 10,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "skillId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
    "requireJustification" BOOLEAN NOT NULL DEFAULT false,
    "maxScore" INTEGER NOT NULL DEFAULT 20,
    CONSTRAINT "Decision_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "costsJson" TEXT NOT NULL DEFAULT '{}',
    "quality" TEXT NOT NULL DEFAULT 'ACCEPTABLE',
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "xpDelta" INTEGER NOT NULL DEFAULT 0,
    "skillDeltasJson" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "DecisionOption_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DecisionOutcome" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionId" TEXT NOT NULL,
    "consequenceText" TEXT NOT NULL,
    "feedbackText" TEXT NOT NULL DEFAULT '',
    "contextUpdateText" TEXT NOT NULL DEFAULT '',
    "variableDeltasJson" TEXT NOT NULL DEFAULT '{}',
    "penaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "revealResourceId" TEXT,
    "unlockStepId" TEXT,
    "nextStepId" TEXT,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DecisionOutcome_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "DecisionOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DecisionOutcome_revealResourceId_fkey" FOREIGN KEY ("revealResourceId") REFERENCES "Resource" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DecisionOutcome_unlockStepId_fkey" FOREIGN KEY ("unlockStepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DecisionOutcome_nextStepId_fkey" FOREIGN KEY ("nextStepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "stepId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "url" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "unlockRuleJson" TEXT NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Resource_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Resource_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DataSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "stepId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT 'TABLE',
    "columnsJson" TEXT NOT NULL DEFAULT '[]',
    "rowsJson" TEXT NOT NULL DEFAULT '[]',
    "fileKey" TEXT,
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "anomaliesJson" TEXT NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DataSet_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataSet_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "submissionMode" TEXT NOT NULL DEFAULT 'TEXT',
    "minWords" INTEGER,
    "maxWords" INTEGER,
    "requiredElementsJson" TEXT NOT NULL DEFAULT '[]',
    "acceptedMimeJson" TEXT NOT NULL DEFAULT '[]',
    "deadlineMinutes" INTEGER,
    "maxScore" INTEGER NOT NULL DEFAULT 30,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Deliverable_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationCriteria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT,
    "stepId" TEXT,
    "deliverableId" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "maxPoints" INTEGER NOT NULL DEFAULT 20,
    "weight" REAL NOT NULL DEFAULT 1,
    "rubricJson" TEXT NOT NULL DEFAULT '[]',
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EvaluationCriteria_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationCriteria_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationCriteria_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "stepId" TEXT,
    "learnerDeliverableId" TEXT,
    "evaluatorType" TEXT NOT NULL,
    "evaluatorUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "scoresJson" TEXT NOT NULL DEFAULT '{}',
    "totalScore" REAL NOT NULL DEFAULT 0,
    "maxScore" REAL NOT NULL DEFAULT 0,
    "comment" TEXT NOT NULL DEFAULT '',
    "aiJobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" DATETIME,
    CONSTRAINT "Evaluation_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_learnerDeliverableId_fkey" FOREIGN KEY ("learnerDeliverableId") REFERENCES "LearnerDeliverable" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Evaluation_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "AIJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "stepId" TEXT,
    "source" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "viewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Feedback_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "missionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "weight" REAL NOT NULL DEFAULT 1,
    "targetLevel" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    CONSTRAINT "MissionSkill_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MissionSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StepSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stepId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    CONSTRAINT "StepSkill_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StepSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "mode" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "maxParticipants" INTEGER,
    "settingsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Session_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Session_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'JOINED',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnerProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "currentStepId" TEXT,
    "completedStepIdsJson" TEXT NOT NULL DEFAULT '[]',
    "unlockedStepIdsJson" TEXT NOT NULL DEFAULT '[]',
    "stateJson" TEXT NOT NULL DEFAULT '{}',
    "score" REAL NOT NULL DEFAULT 0,
    "maxScore" REAL NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "lastActivityAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnerProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearnerProgress_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LearnerProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LearnerProgress_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LearnerProgress_currentStepId_fkey" FOREIGN KEY ("currentStepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnerDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "decisionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "justification" TEXT,
    "constraintCheckJson" TEXT NOT NULL DEFAULT '[]',
    "timeTakenSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnerDecision_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearnerDecision_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LearnerDecision_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "DecisionOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnerAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "answerJson" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "score" REAL,
    "autoFeedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LearnerAnswer_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearnerAnswer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearnerDeliverable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "contentText" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearnerDeliverable_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearnerDeliverable_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "Deliverable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER,
    CONSTRAINT "ResourceView_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceView_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MissionResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "finalScore" REAL NOT NULL,
    "maxScore" REAL NOT NULL,
    "skillResultsJson" TEXT NOT NULL,
    "strengthsJson" TEXT NOT NULL DEFAULT '[]',
    "improvementsJson" TEXT NOT NULL DEFAULT '[]',
    "decisionsSummaryJson" TEXT NOT NULL DEFAULT '[]',
    "recommendation" TEXT NOT NULL DEFAULT '',
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "generatedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MissionResult_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'award',
    "criteriaType" TEXT NOT NULL,
    "criteriaJson" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Badge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerBadge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "progressId" TEXT,
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBadge_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "XPTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "progressId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XPTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "XPTransaction_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT,
    "error" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "costCents" INTEGER,
    "missionId" TEXT,
    "progressId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "AIJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AIJob_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIJob_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "progressId" TEXT NOT NULL,
    "stepId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "helpLevel" INTEGER,
    "jobId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIMessage_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AIMessage_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "MissionStep" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AIMessage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AIJob" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CourseImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "fileKey" TEXT,
    "url" TEXT,
    "rawText" TEXT NOT NULL DEFAULT '',
    "analysisJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourseImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CourseImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningPath" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningPath_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearningPath_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningPathItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pathId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'APPLICATION',
    "unlockRuleJson" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "LearningPathItem_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "LearningPath" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LearningPathItem_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "progressId" TEXT,
    "missionId" TEXT,
    "propertiesJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AnalyticsEvent_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LearnerProgress" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "metaJson" TEXT NOT NULL DEFAULT '{}',
    "ipHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_key" ON "Membership"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_email_idx" ON "Invitation"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_organizationId_slug_key" ON "Skill"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "Mission_organizationId_status_idx" ON "Mission"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Mission_createdById_idx" ON "Mission"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_missionId_key" ON "Scenario"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerRole_missionId_key" ON "LearnerRole"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "Constraint_missionId_key_key" ON "Constraint"("missionId", "key");

-- CreateIndex
CREATE INDEX "MissionStep_missionId_order_idx" ON "MissionStep"("missionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MissionStep_missionId_key_key" ON "MissionStep"("missionId", "key");

-- CreateIndex
CREATE INDEX "Task_stepId_order_idx" ON "Task"("stepId", "order");

-- CreateIndex
CREATE INDEX "Decision_stepId_order_idx" ON "Decision"("stepId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionOutcome_optionId_key" ON "DecisionOutcome"("optionId");

-- CreateIndex
CREATE INDEX "Resource_missionId_stepId_idx" ON "Resource"("missionId", "stepId");

-- CreateIndex
CREATE INDEX "DataSet_missionId_stepId_idx" ON "DataSet"("missionId", "stepId");

-- CreateIndex
CREATE INDEX "Evaluation_progressId_idx" ON "Evaluation"("progressId");

-- CreateIndex
CREATE INDEX "Feedback_progressId_stepId_idx" ON "Feedback"("progressId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionSkill_missionId_skillId_key" ON "MissionSkill"("missionId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "StepSkill_stepId_skillId_key" ON "StepSkill"("stepId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");

-- CreateIndex
CREATE INDEX "Session_organizationId_status_idx" ON "Session"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_userId_key" ON "SessionParticipant"("sessionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "LearnerProgress_missionId_status_idx" ON "LearnerProgress"("missionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProgress_sessionId_userId_key" ON "LearnerProgress"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "LearnerDecision_progressId_decisionId_idx" ON "LearnerDecision"("progressId", "decisionId");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerAnswer_progressId_taskId_attempt_key" ON "LearnerAnswer"("progressId", "taskId", "attempt");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerDeliverable_progressId_deliverableId_version_key" ON "LearnerDeliverable"("progressId", "deliverableId", "version");

-- CreateIndex
CREATE INDEX "ResourceView_progressId_resourceId_idx" ON "ResourceView"("progressId", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionResult_progressId_key" ON "MissionResult"("progressId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_organizationId_code_key" ON "Badge"("organizationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBadge_userId_badgeId_key" ON "PlayerBadge"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "XPTransaction_userId_idx" ON "XPTransaction"("userId");

-- CreateIndex
CREATE INDEX "AIJob_organizationId_type_createdAt_idx" ON "AIJob"("organizationId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AIMessage_progressId_createdAt_idx" ON "AIMessage"("progressId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LearningPathItem_pathId_missionId_key" ON "LearningPathItem"("pathId", "missionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_organizationId_missionId_idx" ON "AnalyticsEvent"("organizationId", "missionId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
