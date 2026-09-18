# MissionIA — Modèle de données

Source de vérité : `prisma/schema.prisma` (SQLite en dev, PostgreSQL en prod). Les listes de valeurs sont dans `src/lib/constants.ts`. Les champs marqués **SERVER-ONLY** ne sont jamais sérialisés vers un client apprenant.

## Vue d'ensemble

```
User ─┬─ Membership ──── Organization ─┬─ Mission ─┬─ Scenario (1:1)
      │                                │           ├─ LearnerRole (1:1)
      ├─ SessionParticipant            │           ├─ Constraint[]
      ├─ TeamMember                    │           ├─ MissionSkill[] ── Skill
      ├─ LearnerProgress               │           ├─ Resource[]        ← ResourceView
      ├─ PlayerBadge / XPTransaction   │           ├─ DataSet[]
      └─ AIJob / CourseImport          │           ├─ EvaluationCriteria[] (bilan global)
                                       │           └─ MissionStep[] ─┬─ Task[]            ← LearnerAnswer
                                       │                             ├─ Decision[] ── DecisionOption[] ── DecisionOutcome (1:1)   ← LearnerDecision
                                       │                             ├─ Deliverable[] ── EvaluationCriteria[]                     ← LearnerDeliverable ← Evaluation
                                       │                             ├─ StepSkill[] ── Skill
                                       │                             └─ Resource[] / DataSet[] (rattachés à l'étape)
                                       ├─ Session ─┬─ SessionParticipant[]
                                       │           ├─ Team[] ── TeamMember[]
                                       │           └─ LearnerProgress[] ─┬─ LearnerDecision[] / LearnerAnswer[] / LearnerDeliverable[]
                                       │                                 ├─ Evaluation[] / Feedback[] / ResourceView[] / AIMessage[]
                                       │                                 └─ MissionResult (1:1)
                                       ├─ LearningPath ── LearningPathItem[] ── Mission
                                       ├─ Skill[] / Badge[] (null orgId = bibliothèque globale)
                                       ├─ AIJob[] / CourseImport[]
                                       └─ AnalyticsEvent[] / AuditLog[] / Invitation[]
```

## Entités

| Entité | Rôle | Points clés |
|---|---|---|
| **User** | Compte | `isPlatformAdmin` distinct des rôles d'organisation |
| **Organization** | Tenant | `plan`, `settingsJson` |
| **Membership** | Rôle par organisation | `@@unique(userId, organizationId)` |
| **Invitation** | Onboarding | token, expiration, session optionnelle |
| **Skill** | Référentiel | `organizationId` null = global |
| **Mission** | Contenu auteur | statut, version, `scoringMode`, `coachEnabled`, `sourceType`, `duplicatedFromId` |
| **Scenario** | Briefing | companyName, setting, context, problem, stakes, timeframe, briefing, openingMessage |
| **LearnerRole** | Rôle attribué | titre, service, hiérarchie, responsabilités |
| **Constraint** | Contraintes comparables | key, type, operator, value, unit |
| **MissionStep** | Étape | order, key stable, stepType, unlockRuleJson, isLocked, feedbacks, `successCriteria` SERVER-ONLY |
| **Task** | Action évaluable | type, configJson, `answerKeyJson` SERVER-ONLY, autoGrade, maxAttempts |
| **Decision / DecisionOption / DecisionOutcome** | Moteur de branching | costsJson vs contraintes ; `quality`, `scoreDelta`, `skillDeltasJson` SERVER-ONLY ; outcome : conséquence, contexte, variables, pénalité, ressource révélée, étape débloquée, nextStep |
| **Resource** | Ressource | type, contenu ou fileKey privé, isRequired, unlockRuleJson |
| **DataSet** | Données pro | columnsJson, rowsJson, fileKey, `anomaliesJson` SERVER-ONLY |
| **Deliverable** | Production attendue | format, mode de dépôt, longueur, éléments obligatoires, MIME acceptés, deadline, isFinal |
| **EvaluationCriteria** | Grille | rattachée à mission, étape ou livrable ; `rubricJson` SERVER-ONLY ; isHidden |
| **Evaluation** | Verdict | evaluatorType AUTO / AI / TRAINER ; statut PROPOSED → VALIDATED / MODIFIED / REJECTED ; lien AIJob |
| **Feedback** | Retour pédagogique | source, kind, viewedAt |
| **MissionSkill / StepSkill** | Compétences mobilisées | poids, niveau cible |
| **Session** | Instance de mission | code d'accès unique, statut, mode, settingsJson (overrides) |
| **SessionParticipant / Team / TeamMember** | Participation | équipe simplifiée pour le MVP |
| **LearnerProgress** | État d'une tentative | currentStepId, completedStepIdsJson, unlockedStepIdsJson, `stateJson` (variables), score, xp, hintsUsed, temps |
| **LearnerDecision / LearnerAnswer / LearnerDeliverable** | Traces | justification, constraintCheckJson ; tentatives ; versions |
| **ResourceView** | Suivi de consultation | durée |
| **MissionResult** | Bilan | compétences, forces, axes, décisions, recommandation |
| **Badge / PlayerBadge / XPTransaction** | Gamification | badges globaux ou d'organisation ; raisons d'XP |
| **AIJob / AIMessage** | Traçabilité IA | type, statut, provider, tokens, coût, entrée filtrée ; messages du coach avec helpLevel |
| **CourseImport** | Import de cours | sourceType, rawText, analysisJson |
| **LearningPath / LearningPathItem** | Parcours multi-missions | kind DISCOVERY / APPLICATION / COMPLEX / SIMULATION / FINAL |
| **AnalyticsEvent / AuditLog** | Mesure et traçabilité | nom d'événement typé, propriétés |

## Règles d'intégrité appliquées côté application
- Une mission publiée est figée : toute modification crée une nouvelle `version` ; les sessions référencent la version jouée.
- Publication refusée si : aucune étape, briefing incomplet, option sans conséquence, livrable sans critère, `nextStepId` pointant hors mission, cycle de branching.
- `LearnerProgress` unique par (session, utilisateur) ; en mode équipe, une progression par équipe.
- Suppression en cascade contenue à l'intérieur d'une mission ; les traces apprenant ne sont jamais supprimées avec une mission publiée (archivage).
