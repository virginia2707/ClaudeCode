# MissionIA — T · Think / Conception

## 1. Architecture technique

| Couche | Choix | Pourquoi |
|---|---|---|
| Frontend | **Next.js 16 (App Router) + React 19 + TypeScript** | Un seul projet full-stack, Server Components pour ne jamais envoyer les corrigés au client, Server Actions pour les mutations |
| Styles | **Tailwind CSS v4 + tokens CSS sémantiques** | Design system léger, cohérent, sans runtime |
| Backend | **Server Actions + Route Handlers Next.js** (Node.js) | Pas de second service à déployer ; validation Zod à l'entrée de chaque action |
| Base de données | **Prisma 5** · SQLite en dev, **PostgreSQL** en prod | Zéro infra pour démarrer ; bascule par `provider` + `url` |
| Authentification | **Sessions JWT signées en cookie httpOnly** (bcrypt) — phase 2 | Maîtrise totale, pas de dépendance tierce ; SSO ajouté plus tard via adaptateur |
| Stockage fichiers | **Adaptateur `FileStorage`** : local privé en dev, S3-compatible en prod, URLs signées | Les fichiers ne sont jamais servis statiquement |
| Temps réel | **Polling léger / Server-Sent Events** pour le suivi de session | Suffisant pour le MVP ; WebSocket seulement si le mode équipe le réclame |
| IA | **`AIService` → `AIProvider`** (stub déterministe, Anthropic, …) | Abstraction obligatoire, journalisation `AIJob`, filtrage PII |
| Analytics | **Table `AnalyticsEvent`** + adaptateur externe optionnel | Propriété des données, requêtes SQL pour les dashboards |
| Tests | **Vitest** (unitaires) · **Playwright + axe-core** (e2e, responsive, a11y) | Déjà en place en phase 1 |
| Déploiement | Vercel / Docker sur n'importe quel hôte Node + Postgres managé + bucket S3 | Simplicité |

Principe : simplicité et maintenabilité. Aucun micro-service, aucune file de messages tant qu'un besoin réel ne l'exige pas. Les jobs IA longs sont exécutés dans une Server Action avec statut persisté (`AIJob.status`) et affichage progressif.

## 2. Architecture SaaS

- **Multi-tenant par organisation** : toute entité métier porte `organizationId` directement ou via sa mission. Un helper `orgScope(user)` est injecté dans chaque requête Prisma ; aucune requête « globale » côté produit.
- **Membership** : rôle par organisation (`ADMIN`, `TRAINER`, `LEARNER`). Un formateur indépendant possède une organisation personnelle créée à l'inscription.
- **Plans** (`FREE`, `PRO`, `BUSINESS`, `ENTERPRISE`) stockés sur l'organisation ; `PLAN_LIMITS` appliqué côté serveur (nombre de missions, formateurs, IA, analytics). Paiement hors MVP.
- **Invitations** par email + token ; invitation directe à une session pour les apprenants ; code d'accès de session pour rejoindre sans invitation nominative.
- **Bibliothèque globale** : compétences et badges avec `organizationId = null`, lisibles par tous, non modifiables.

## 3. Rôles et permissions

Matrice implémentée dans `src/lib/authz/permissions.ts` (testée) : `LEARNER ⊂ TRAINER ⊂ ADMIN`. Le serveur appelle `assertCan(role, permission)` **et** vérifie l'appartenance à l'organisation de la ressource. Le frontend ne fait que masquer. `isPlatformAdmin` (super-admin MissionIA) est distinct des rôles d'organisation.

## 4. Parcours Trainer

1. Inscription → organisation personnelle → dashboard vide avec « Créer une mission » / « Créer avec l'IA » / « Importer un cours ».
2. Création : fiche mission (titre, secteur, métier, niveau, durée, difficulté, objectifs, compétences, mode) → scénario (qui / où / problème / pourquoi / délai / contraintes / résultat) → rôle apprenant → contraintes.
3. Mission Builder : liste d'étapes réordonnables (drag & drop, ajouter, dupliquer, supprimer, verrouiller) ; éditeur d'étape par type (tâches, décision + options + conséquences, ressources, jeux de données, livrable + critères, feedback).
4. Prévisualisation « vue apprenant » → validation de publication (règles : ≥ 1 étape, briefing complet, aucune étape orpheline, options avec conséquence, critères sur chaque livrable) → publication (version figée).
5. Session : créer, code d'accès, inviter, ouvrir / fermer ; suivi en direct (étape courante, décisions, livrables en attente).
6. Évaluation : file des livrables à évaluer ; proposition IA (si activée) → consulter / modifier / valider / rejeter.
7. Résultats et statistiques : par mission, session, étape, compétence ; recommandations.
8. Dupliquer une mission (copie profonde, `sourceType = DUPLICATED`).

## 5. Parcours Learner

1. Rejoindre (code de session ou invitation) → briefing immersif (qui / où / problème / pourquoi / délai / contraintes / résultat attendu) → « Commencer la mission ».
2. Écran de mission (3 zones) : contexte (rôle, objectif, contraintes, briefing) · étape courante (nouveau contexte, action attendue, tâches / décision / livrable, coach) · progression (étapes, ressources, compétences, temps).
3. Après chaque action : feedback structuré (réussite / erreur / explication / conséquence / recommandation), alertes de contraintes, mise à jour du contexte, étape suivante (linéaire ou branchée).
4. Reprise possible à tout moment (`LearnerProgress` = source de vérité).
5. Fin : bilan (score si activé, temps, décisions, compétences, points forts, points à améliorer, livrables, recommandations) ; badges et XP en second plan.
6. Dashboard : missions en cours / terminées, compétences, XP, badges, résultats, feedback.

## 6. Moteur de missions

Machine à états côté serveur (`src/lib/mission-engine/`) :

```
resolveCurrentStep(progress)       → étape à afficher (respecte unlock rules, branching, verrouillage)
buildLearnerStepView(step, state)  → DTO filtré (jamais answerKey, quality, rubric cachés, anomalies)
submitTask / submitDecision / submitDeliverable
  → valider (Zod) → évaluer (grader du type) → appliquer conséquences (variables, contexte, ressources)
  → générer feedback → enregistrer (LearnerAnswer / LearnerDecision / LearnerDeliverable / Feedback)
  → calculer nextStep → mettre à jour LearnerProgress (transaction)
completeMission(progress)          → MissionResult, XP, badges, événement mission_completed
```

- **Registre de mécaniques** (`ACTION_TYPE_REGISTRY`) : chaque type déclare son mode d'évaluation, s'il produit un livrable, sa disponibilité. Ajouter une mécanique = une entrée + un composant + un grader.
- **État d'exécution** (`MissionRuntimeState` dans `LearnerProgress.stateJson`) : variables, contexte injecté, ressources révélées, étapes visitées.
- **Règles de déblocage** (`unlockRuleJson`) : `afterStepKey`, `afterDecisionOption`, `always`.

## 7. Décisions et conséquences

`Decision → DecisionOption[] → DecisionOutcome`. Une conséquence peut : narrer (`consequenceText`), expliquer (`feedbackText`), changer le contexte (`contextUpdateText`), modifier des variables (`variableDeltasJson`), pénaliser, révéler une ressource, débloquer une étape, définir la prochaine étape (`nextStepId`, branching) ou terminer.

- **Linéaire** : `nextStepId = null` → étape suivante par `order`.
- **Branché** : `nextStepId` défini ; les branches se rejoignent par `order` ou par une étape `DEBRIEF`.
- **Contraintes** : `costsJson` de l'option comparé aux `Constraint` de la mission via `checkConstraints()` (testé) → alertes « Votre proposition dépasse la limite « Budget maximum » de 8 000 € ».
- Les champs `quality`, `scoreDelta`, `skillDeltasJson` restent serveur.

## 8. Livrables

`Deliverable` (format, consignes, longueur, éléments obligatoires, formats acceptés, deadline, grille) → `LearnerDeliverable` versionné (texte et/ou fichier via `FileStorage`, statut DRAFT / SUBMITTED / EVALUATED). Formats MVP : email, rapport, plan d'action, présentation (texte structuré), tableur, mémo, proposition. Upload : PDF, DOCX, XLSX, PPTX, CSV, TXT, 20 Mo max, type MIME vérifié côté serveur, antivirus optionnel plus tard.

## 9. Évaluation

Quatre modes coexistent :
1. **Automatique** (grader par type : MCQ, calcul avec tolérance, classement par distance, association, mots-clés) → `Evaluation(evaluatorType = AUTO, status = VALIDATED)`.
2. **Par critères** : `EvaluationCriteria` (label, description, points, rubrique) rattachés à une mission, une étape ou un livrable.
3. **Formateur** : saisie des points par critère, commentaire.
4. **Assistée par IA** : `evaluateDeliverable()` produit une proposition (`status = PROPOSED`, `confidence`) ; le formateur **consulte, modifie, valide ou rejette**. Rien n'est communiqué à l'apprenant avant validation.

Score configurable par mission (`scoringConfigJson` : pondérations analyse / décision / livrable / résolution / justification, bonus d'autonomie, pénalité d'indice) ; mode `SKILLS_ONLY` sans score ni classement.

## 10. Feedback

`Feedback(kind ∈ SUCCESS | ERROR | EXPLANATION | CONSEQUENCE | RECOMMENDATION)` produit par le système (textes du formateur), par l'IA (`generateFeedback`) ou par le formateur. Toujours présenté en blocs distincts, jamais un simple « correct / incorrect ». `viewedAt` alimente l'événement `feedback_viewed`.

## 11. Architecture IA

- **`AIService`** (`src/lib/ai/ai-service.ts`) : façade unique, méthodes `analyzeCourse`, `generateMission`, `generateScenario`, `generateSteps`, `generateDecision`, `generateFeedback`, `evaluateDeliverable`, `generateCoachResponse`, `generateLearningReport`.
- **`AIProvider`** : interface ; implémentations `stub` (déterministe, hors-ligne, pour dev/tests) puis fournisseur réel en phase 16. Sorties structurées validées par Zod avant persistance.
- **Contexte fourni** : contenu du cours, objectifs, niveau, public, compétences, étape courante, ressources, réponses et décisions précédentes, règles de la mission. **Jamais** les corrigés dans le prompt du coach.
- **Coach** : `helpLevel` 1 → 5 ; niveaux autorisés définis par le formateur ; chaque réponse journalisée (`AIMessage`) ; pénalité d'indice optionnelle.
- **Workflow de génération** : `CourseImport → ANALYZE_COURSE → objectifs / compétences → GENERATE_MISSION (brouillon, status DRAFT, sourceType AI_GENERATED) → review → modification → prévisualisation → validation → publication`. L'IA ne publie jamais.
- **Protection du contenu** : `redactPII` (emails, téléphones, IBAN), pseudonymisation des identités, `sendLearnerUploads = false`, taille de contexte bornée, `AIJob.inputJson` stocke l'entrée **après** filtrage.

## 12. Statistiques

Événements (`src/lib/analytics/events.ts`) : `mission_created`, `mission_generated`, `mission_published`, `mission_started`, `step_started`, `resource_opened`, `decision_submitted`, `decision_completed`, `deliverable_submitted`, `feedback_viewed`, `mission_completed`, `mission_abandoned`, `coach_used`. Agrégats formateur : complétion, score moyen, temps moyen, étapes problématiques (taux d'échec / temps), décisions les plus fréquentes, compétences maîtrisées / à renforcer, recommandations.

## 13. Sécurité

- Authentification cookie httpOnly, `SameSite=Lax`, `Secure` en prod ; mots de passe bcrypt ; rotation possible via `AUTH_SECRET`.
- Autorisation : `assertCan` + scope organisation dans chaque action ; vérification de propriété (`mission.organizationId === user.orgId`).
- Validation serveur systématique (Zod) ; limites de taille ; types MIME vérifiés ; fichiers servis uniquement par URL signée courte.
- Rate limiting sur login, inscription, coach IA, upload (mémoire en dev, Redis/Upstash en prod via adaptateur).
- Anti-triche : colonnes `SERVER-ONLY` jamais sérialisées, DTO apprenant construits explicitement, évaluation côté serveur, verrouillage des étapes, une tentative = une ligne `LearnerAnswer` (`maxAttempts`).
- Isolation des organisations ; `AuditLog` sur les actions sensibles (publication, validation d'évaluation, changement de rôle) ; en-têtes de sécurité (CSP, frame-ancestors) via `next.config.ts` en phase 20.

## 14. Structure des pages

```
/                         landing (phase 1)            /demo                    aperçu mission (phase 1 → complète phase 19)
/login  /register         auth (phase 2)               /invite/[token]          acceptation d'invitation (phase 2)
/app                      redirection par rôle
/app/trainer              dashboard formateur (3)      /app/trainer/missions/new           création (4)
/app/trainer/missions/[id]                             builder : étapes, décisions, ressources, données, livrables, évaluation (5-10)
/app/trainer/missions/[id]/preview                     vue apprenant
/app/trainer/sessions  /app/trainer/sessions/[id]      sessions, suivi, évaluation (14-15)
/app/trainer/analytics                                 statistiques (15)
/app/learn                dashboard apprenant (11)     /app/learn/join                      rejoindre
/app/learn/missions/[progressId]                       écran de mission (11-12)
/app/learn/missions/[progressId]/report                bilan (12)
/app/admin                organisation, membres, paramètres (2-3)
/design-system            fondations UI (1)
```

## 15. Structure des composants

```
src/components/ui/          Button, ButtonLink, Card, Badge, ProgressBar, SkillList, Field/Input/Textarea/Select, Alert, Stat, SectionHeading, Logo, Icon
src/components/marketing/   SiteHeader, SiteFooter (+ sections de la landing)
src/components/demo/        DecisionPreview
src/components/builder/     (phases 5-10) StepList (dnd), StepEditor, DecisionEditor, OutcomeEditor, ResourceManager, DataSetEditor, DeliverableEditor, CriteriaEditor
src/components/mission/     (phases 11-12) MissionShell, BriefingScreen, StepView, actions/* (un composant par ActionType), FeedbackPanel, ConstraintAlerts, CoachPanel, ProgressRail
src/components/dashboard/   (phases 3, 15) MissionCard, SessionTable, SkillHeatmap, StatTiles
src/lib/                    constants, authz, ai, analytics, mission-engine, utils, (auth, storage, rate-limit à venir)
```

## 16. Extensibilité

- Nouvelle mécanique : entrée dans `ACTION_TYPE_REGISTRY` + composant `actions/<Type>.tsx` + grader `graders/<type>.ts`.
- Nouveau fournisseur IA : classe implémentant `AIProvider`, sélection par `AI_PROVIDER`.
- Nouveau type de conséquence : champ additionnel sur `DecisionOutcome` + handler dans `applyOutcome`.
- Simulation conversationnelle / Game Master : nouveau `ActionType` `DIALOGUE` s'appuyant sur `AIMessage` sans changer le moteur.
- Intégrations LMS : couche d'export (SCORM / LTI) lisant `MissionResult`, hors MVP.
