# EscapeClass — Research & Architecture (RTFTC : phases R et T)

> Escape games pédagogiques numériques pour la formation professionnelle.
> Ce document est le livrable des phases **R — Research** et **T — Think**.
> Il précède toute implémentation et sert de référence à toutes les phases suivantes.

---

## 1. Analyse du produit

### 1.1 Le problème

| Utilisateur | Difficulté observée | Conséquence |
|---|---|---|
| Formateur | Un cours de 2 h reste un exposé + un quiz. Transformer ce contenu en activité engageante demande du temps, des outils disparates (Genially, Google Forms, Kahoot…) et aucun n'est conçu pour un scénario d'énigmes chaîné. | Peu d'activités interactives, attention en baisse après 20 minutes. |
| Formateur | Aucune mesure fine des compétences : un quiz donne une note, pas un diagnostic. | Impossible d'identifier *quelle* compétence bloque. |
| Formateur | Les contenus ne sont pas réutilisables d'un groupe à l'autre sans tout refaire. | Perte de temps, activités abandonnées. |
| Organisme de formation | Offre indifférenciée, difficulté à prouver l'engagement et les acquis (Qualiopi, financeurs). | Faible différenciation commerciale, reporting manuel. |
| Apprenant adulte | Formats passifs, feedback tardif, exercices déconnectés du métier. | Désengagement, faible transfert en situation de travail. |

### 1.2 Proposition de valeur

> « J'ai un cours de 2 heures sur Excel » → « Je crée une mission de 45 minutes dans laquelle les apprenants doivent utiliser Excel pour résoudre 5 problèmes professionnels et débloquer un fichier final. »

EscapeClass rend ce passage **simple** (assistant de création + IA), **pédagogique** (chaque énigme est reliée à une compétence, feedback immédiat, rapport de compétences) et **fiable** (validation serveur, chronomètre serveur, statistiques).

Chaîne produit : `COURSE → SCENARIO → ÉNIGMES → INDICES → CODES → PROGRESSION → MISSION FINALE → ÉVALUATION`.

### 1.3 Concurrence conceptuelle

| Outil | Force | Limite par rapport à EscapeClass |
|---|---|---|
| Kahoot / Quizizz | Rapide, ludique | Quiz chronométré, pas de scénario ni de codes, vitesse > compétence. |
| Genially (escape) | Très visuel | Création longue, pas de validation serveur, pas de statistiques de compétences, pas de sessions live. |
| Google Forms « escape » | Gratuit | Bricolage, aucune progression, aucun classement, aucune synchro. |
| LMS (Moodle, 360Learning) | Suivi complet | Aucune mécanique d'escape game native ; EscapeClass pourra s'y intégrer (SCORM/LTI, hors MVP). |

Positionnement : **l'outil dédié** qui transforme un cours en mission professionnelle mesurable, pour des adultes.

### 1.4 Risques

| Risque | Impact | Mitigation |
|---|---|---|
| Création jugée trop longue | Abandon formateur | Assistant pas-à-pas, duplication, génération IA, démo prête. |
| Triche (score/temps côté client) | Perte de crédibilité pédagogique | Toute la logique de jeu est serveur : réponses, score, temps, déblocage. |
| Temps réel complexe | Bugs, coûts | SSE + polling de repli, état source de vérité en base, pas de serveur WebSocket dédié au MVP. |
| Énigmes trop « quiz » | Faible valeur pédagogique | Types d'énigmes orientés action (fichier à analyser, ordre logique, association), compétence obligatoire par énigme, feedback explicatif. |
| Mobile négligé | Apprenants sur smartphone | Écran apprenant conçu mobile-first. |
| Dette d'architecture | Ralentissement | Moteur de puzzles en registre extensible, conditions de déblocage en JSON typé, service IA abstrait. |

---

## 2. Utilisateurs et personas

| Persona | Objectif | Besoins clés |
|---|---|---|
| **Trainer** (formateur indépendant, formateur d'OF, enseignant) | Créer et animer des missions | Création rapide, prévisualisation, lancement de session, écran live, statistiques par compétence, réutilisation. |
| **Learner** (stagiaire adulte, salarié, étudiant) | Réussir la mission et progresser | Rejoindre en 10 secondes (code ou QR), consigne claire, feedback immédiat, progression visible, résultat final compréhensible. |
| **Admin** (exploitant plateforme) | Superviser | Gestion des utilisateurs, des contenus, statistiques globales, modération. |
| **Org Owner / Org Manager** (post-MVP) | Piloter un organisme | Gestion des formateurs, catalogue partagé, analytics consolidés. |

Hiérarchie cible : `Organization → Memberships (Trainers) → EscapeGames → GameSessions → SessionPlayers/Teams → Results`.
Le MVP fonctionne **sans** organisation (l'utilisateur est son propre espace) mais le modèle de données prévoit `Organization` et `Membership` dès le départ pour éviter une migration lourde.

---

## 3. Architecture technique

### 3.1 Choix de stack

| Couche | Choix | Justification |
|---|---|---|
| Frontend | **Next.js 16 (App Router) + React 19 + TypeScript** | Un seul projet full-stack, Server Components pour les pages, Server Actions pour les mutations, Route Handlers pour l'API/SSE. |
| Style | **Tailwind CSS v4** + tokens CSS (`globals.css`) | Design system léger, thème sombre premium, classes utilitaires réutilisables. |
| Backend | **Server Actions + Route Handlers (Node runtime)** | Pas de second serveur à déployer ; logique métier dans `src/lib/*` testable indépendamment. |
| Base de données | **Prisma 5 + SQLite** en dev/MVP, **PostgreSQL** en production | Zéro infra pour démarrer ; bascule = changer `provider` + `url`. Les enums sont des `String` (contrainte SQLite) validées par `zod`. |
| Authentification | **Sessions JWT signées (httpOnly cookie)** + `bcryptjs` | Sans dépendance tierce, adapté au SSO ultérieur (Enterprise) via une couche `auth-provider`. |
| Temps réel | **Server-Sent Events** (`/api/sessions/[id]/events`) + **polling de repli** | Unidirectionnel serveur→client suffit (les actions apprenant passent par des Server Actions). Fonctionne sur tout hébergement Node. WebSocket possible plus tard derrière la même interface `RealtimeHub`. |
| Fichiers | **Stockage local `/uploads` derrière une interface `StorageProvider`** | S3/R2 branché plus tard sans toucher les appelants. Validation de type MIME + taille. |
| IA | **`AIService` + interface `AIProvider`** | `StubAIProvider` déterministe en dev ; `AnthropicProvider` optionnel via clé d'environnement. Jamais de publication automatique. |
| Analytics | **Table `AnalyticsEvent`** + agrégations SQL | Événements produit (`game_created`, `answer_submitted`…) exploitables sans outil externe ; export possible. |
| Tests | **Vitest** (logique moteur/scoring/normalisation) + **Playwright** (parcours critiques) | Le moteur de jeu est pur (fonctions sans effet), donc testable unitairement. |
| Déploiement | **Vercel / tout hôte Node** (Docker fourni ultérieurement) | SSE nécessite le runtime Node (pas Edge). |

### 3.2 Architecture SaaS

```
┌──────────────────────────────────────────────────────────────────┐
│ Next.js App                                                       │
│  ├─ (marketing)   /            landing, /demo, /pricing, /faq     │
│  ├─ (auth)        /login /register /logout                        │
│  ├─ (trainer)     /app/…       dashboard, builder, sessions, stats│
│  ├─ (learner)     /join /play/[code]/…   mobile-first             │
│  ├─ (admin)       /admin/…                                        │
│  └─ api/          /api/sessions/[id]/events (SSE), /api/uploads   │
│                                                                   │
│ src/lib (domaine, sans React)                                     │
│  ├─ auth/        sessions, rôles, permissions                     │
│  ├─ engine/      moteur : déblocage, validation, scoring, timer   │
│  ├─ puzzles/     registre des types d'énigmes (extensible)        │
│  ├─ realtime/    RealtimeHub (SSE) + événements de session        │
│  ├─ ai/          AIService + providers                            │
│  ├─ storage/     StorageProvider                                  │
│  ├─ analytics/   track(event)                                     │
│  └─ badges/      règles de badges (extensible)                    │
└──────────────────────────────────────────────────────────────────┘
                     │ Prisma
                     ▼
            SQLite (dev) / PostgreSQL (prod)
```

Multi-tenant logique : chaque `EscapeGame` appartient à un `ownerId` et optionnellement à une `organizationId`. Toutes les requêtes trainer sont filtrées par propriétaire/organisation. Les plans (`FREE/PRO/BUSINESS/ENTERPRISE`) sont portés par `User.plan` et `Organization.plan` et appliqués via `src/lib/plans.ts` (limites de jeux/sessions), sans paiement dans le MVP.

---

## 4. Modèle de données

Enums stockés en `String` (SQLite), listes canoniques dans `src/lib/constants.ts`.

| Modèle | Rôle | Champs clés |
|---|---|---|
| `User` | Compte | email unique, passwordHash, role (`ADMIN/TRAINER/LEARNER`), plan |
| `Organization` | Organisme (post-MVP actif) | name, slug, plan |
| `Membership` | Lien user↔org | role (`OWNER/MANAGER/TRAINER`) |
| `EscapeGame` | Le jeu | title, description, category, level, difficulty, estimatedMinutes, maxMinutes, objective, scenario, introduction, coverImageUrl, mode (`INDIVIDUAL/TEAM`), leaderboardEnabled, maxParticipants, status (`DRAFT/PUBLISHED/ARCHIVED`), ownerId, organizationId, version |
| `GameSetting` | Configuration 1:1 | timerMode (`NONE/GLOBAL/PER_STEP`), pauseAllowed, scoring (basePoints, bonus temps, bonus sans indice, bonus série, pénalités), leaderboardMethod (`COMPLETION/SCORE/TIME/HINTS/PEDAGOGICAL`), immersion (sons/musique) |
| `GameStep` | Étape | order, title, description, instruction, content (rich text), imageUrl, fileUrl, videoUrl, unlockCode, unlockConditions (JSON), points, recommendedSeconds, difficulty, successFeedback, errorFeedback, explanation |
| `Puzzle` | Énigme 1:1 avec l'étape | type (`NUMERIC_CODE/SECRET_WORD/MCQ/TRUE_FALSE/SHORT_ANSWER/MATCHING/ORDERING/SEQUENCE/IMAGE_HOTSPOT/FILE_ANALYSIS`), prompt, config (JSON spécifique au type), validationMode (`AUTO/MANUAL`), maxAttempts |
| `Answer` | Réponses acceptées | value (JSON), isPrimary, normalization flags |
| `Hint` | Indice | order, text, pointCost, timeCostSeconds |
| `Skill` | Compétence | name, description, ownerId (bibliothèque du formateur) |
| `PuzzleSkill` | Lien N:N énigme↔compétence | weight |
| `GameSession` | Session lancée | code (6 caractères, unique, actif), status (`LOBBY/RUNNING/PAUSED/ENDED`), startedAt, pausedAt, pausedTotalSeconds, endsAt, extendedSeconds, gameSnapshot (JSON figé à la publication) |
| `SessionPlayer` | Participant | displayName, firstName, playerToken (cookie signé), teamId, lastSeenAt, connectionState |
| `Team` | Équipe | name, color, sessionId |
| `TeamMember` | Lien joueur↔équipe | role |
| `PlayerProgress` | Progression par « acteur » (joueur ou équipe) | actorType, currentStepId, stepStates (JSON : locked/current/done + timestamps), status (`IN_PROGRESS/COMPLETED/ABANDONED/TIMED_OUT`), score, hintsUsed, wrongAnswers, stepStartedAt |
| `PlayerAnswer` | Tentative | stepId, submitted (JSON), isCorrect, scoreDelta, timeTakenSeconds, createdAt |
| `ScoreEvent` (= *Score*) | Ledger de score | type (`STEP_SUCCESS/HINT/WRONG_ANSWER/TIME_BONUS/STREAK/NO_HINT/TIME_PENALTY`), delta, stepId |
| `Badge` | Définition | code, name, description, icon, ruleType, ruleConfig (JSON), isSystem |
| `PlayerBadge` | Attribution | progressId, badgeId |
| `GameResult` | Rapport figé fin de mission | score, rank, timeSpent, stepsCompleted, skillsJson, recommendationsJson |
| `AIJob` | Tâche IA | type, status, input, output, provider, ownerId |
| `AnalyticsEvent` | Événement produit | name, userId?, sessionId?, gameId?, payload |
| `Upload` | Fichier | url, mime, size, ownerId |

`PuzzleType` n'est **pas** une table : c'est un **registre en code** (`src/lib/puzzles/registry.ts`) qui déclare pour chaque type le schéma de config, le schéma de réponse, le validateur serveur et le composant apprenant. Ajouter un type = ajouter un fichier au registre.

Contraintes : `@@unique([sessionId, displayName])`, `@@unique([progressId, stepId])` sur les états, `@@unique([gameId, order])` sur les étapes, cascade de suppression jeu → étapes → énigmes → réponses/indices, session → joueurs → progression.

---

## 5. Parcours Trainer

1. Inscription → rôle `TRAINER` par défaut → dashboard vide avec « Créer mon premier Escape Game » et « Explorer la démo ».
2. **Créer** : formulaire d'informations (titre, description, catégorie, niveau, durée, scénario, mode, options).
3. **Step Builder** : ajouter/dupliquer/réordonner (drag & drop) des étapes ; pour chaque étape : consigne, contenu, média, type d'énigme, réponses acceptées, indices avec coût, code obtenu, points, compétence, feedback.
4. **Prévisualiser** : mode « aperçu » qui exécute le moteur sans créer de session persistée.
5. **Publier** : validation (≥ 1 étape, chaque énigme a une réponse, timer cohérent) → snapshot versionné.
6. **Lancer une session** : code `K7P4X9` + QR code + lien ; lobby ; « Démarrer la mission ».
7. **Écran live** : participants, progression, bloqués, indices, classement ; actions : débloquer, donner un indice, prolonger, terminer.
8. **Résultats** : classement, rapport par participant, vue compétences, export.
9. **Réutiliser** : dupliquer, archiver, relancer une session.

## 6. Parcours Learner

1. `/join` (ou QR) → code de session + prénom (+ pseudonyme/équipe si mode équipe) → cookie `playerToken` signé.
2. Lobby : « Mission prête », participants connectés, attente du formateur.
3. Introduction + scénario → « Commencer ».
4. Écran de jeu (mobile-first) : titre mission, étape courante, consigne, énigme, zone de réponse, `VALIDER`, `INDICE (−10 pts)`, progression, temps restant, score.
5. Feedback immédiat (succès + explication / erreur + piste) → code obtenu → étape suivante.
6. Mission finale → écran de fin : score, temps, compétences validées/⚠, badges, recommandations.
7. Reconnexion : le cookie restaure la progression ; SSE reprend le flux.

---

## 7. Architecture du moteur d'Escape Game

Le moteur (`src/lib/engine/`) est **pur** : fonctions `(état, action) → (nouvel état, événements)`, sans I/O. Les Server Actions chargent l'état, appellent le moteur, persistent, puis publient les événements temps réel.

```
engine/
  unlock.ts      évalue les conditions de déblocage (AND/OR de règles typées)
  validate.ts    délègue au validateur du type d'énigme, applique la normalisation
  scoring.ts     calcule les deltas (base, bonus, pénalités) selon GameSetting
  timer.ts       temps restant/écoulé côté serveur (startedAt, pauses, prolongations)
  progress.ts    transitions d'état des étapes (LOCKED → AVAILABLE → CURRENT → DONE)
  leaderboard.ts tri selon la méthode choisie (pédagogique par défaut)
  badges.ts      évaluation des règles de badges en fin de mission
```

Conditions de déblocage (JSON typé, extensible) :

```json
{ "all": [ { "type": "step_completed", "stepId": "…" }, { "type": "code", "value": "4729" } ] }
```
Types prévus : `previous_step`, `step_completed`, `code`, `time_after`, `trainer_approval`, `any_of`.

Registre des énigmes (`src/lib/puzzles/registry.ts`) :

```ts
interface PuzzleDefinition<Config, Submission> {
  type: PuzzleType; label; description; icon;
  configSchema: ZodSchema<Config>;      // ce que le formateur configure
  submissionSchema: ZodSchema<Submission>; // ce que l'apprenant envoie
  validate(config, answers, submission): { correct: boolean; detail?: string };
  defaultConfig(): Config;
}
```

## 8. Logique de validation

1. Server Action `submitAnswer(sessionId, stepId, submission)` :
   - vérifie le `playerToken`, que la session est `RUNNING`, que le temps n'est pas écoulé (calcul serveur) ;
   - vérifie que l'étape est bien `CURRENT` pour la progression (interdit l'accès direct) ;
   - vérifie le rate limit (≥ 2 s entre tentatives, `maxAttempts`) ;
   - normalise (`toLowerCase`, trim, espaces multiples → 1, suppression des accents via NFD, ponctuation optionnelle) ;
   - appelle `registry[type].validate` ;
   - écrit `PlayerAnswer`, `ScoreEvent`, met à jour `PlayerProgress`, publie `answer_correct|answer_wrong`, `step_completed`.
2. Validation manuelle : `validationMode = MANUAL` → la tentative passe en `PENDING` et le formateur valide depuis l'écran live.
3. Les bonnes réponses ne sont **jamais** envoyées au client (la snapshot apprenant est filtrée).

## 9. Logique de scoring (configurable par `GameSetting`)

```
score_étape = basePoints (100)
            + bonusTime        (si activé : proportion du temps recommandé restant × coefficient)
            + bonusNoHint      (si aucun indice sur l'étape)
            + bonusStreak      (série de réussites sans erreur)
            − Σ hint.pointCost (affiché avant demande)
            − wrongAnswerPenalty × erreurs
score_final = Σ score_étape − timeoutPenalty (si dépassé)
```
Chaque composante est un `ScoreEvent` : le score est **recalculable** depuis le ledger, jamais stocké seul côté client.

Méthodes de classement : `PEDAGOGICAL` (défaut : étapes réussies, puis compétences validées, puis score, puis indices, puis temps), `SCORE`, `TIME`, `COMPLETION`, `HINTS`.

## 10. Stratégie temps réel

- `RealtimeHub` en mémoire (par instance) : `publish(sessionId, event)` / `subscribe(sessionId)`.
- Route `GET /api/sessions/[id]/events` → SSE avec heartbeat 15 s ; le client reconnecte automatiquement (`EventSource`) et **re-synchronise** en rechargeant l'état complet (`getSessionState`) à chaque reconnexion.
- Polling de repli (5 s) si SSE indisponible.
- Événements : `player_joined`, `player_left`, `session_started`, `session_paused`, `session_resumed`, `time_extended`, `progress_updated`, `leaderboard_updated`, `hint_granted`, `step_unlocked`, `session_ended`.
- Le chronomètre affiché est dérivé de `endsAt` serveur + offset d'horloge mesuré au chargement.
- Évolution : remplacer le hub mémoire par Redis Pub/Sub pour du multi-instance, sans changer l'API.

## 11. Stratégie de sécurité

| Sujet | Mesure |
|---|---|
| Auth | JWT signé, cookie `httpOnly`, `sameSite=lax`, `secure` en prod ; bcrypt (10 rounds). |
| Autorisation | `requireRole()` dans chaque action ; vérification de propriété (`game.ownerId === user.id`) ; admin via rôle. |
| Joueurs anonymes | `playerToken` JWT lié à `(sessionId, playerId)` en cookie httpOnly ; expire avec la session. |
| Validation | `zod` sur toutes les entrées Server Action et route handler. |
| Anti-triche | Réponses, score, temps et déblocage exclusivement serveur ; bonnes réponses jamais envoyées ; étapes verrouillées non servies ; rate limit par joueur ; `maxAttempts`. |
| Codes de session | 6 caractères sans ambiguïté (sans O/0/I/1), unicité parmi les sessions actives, expiration à la fin. |
| Rate limiting | Limiteur mémoire par IP/joueur pour login, join, submitAnswer (extensible à Redis). |
| Fichiers | Liste blanche MIME, taille max, nom aléatoire, servis via route contrôlée. |
| Routes privées | `proxy.ts` (ex-middleware) redirige sans cookie ; vérification réelle côté page/action. |
| Headers | CSP raisonnable, `X-Frame-Options`, `Referrer-Policy` via `next.config.ts`. |

## 12. Structure des pages

```
/                        Landing
/demo                    Présentation de la démo + rejoindre
/pricing  /faq           (sections de la landing, ancrées)
/login  /register  /logout
/join  /join/[code]      Entrée apprenant
/play/[code]             Lobby → jeu → fin (client mobile-first)
/play/[code]/result      Rapport apprenant
/app                     Dashboard trainer (mes jeux, brouillons, publiés, archivés)
/app/games/new           Création
/app/games/[id]          Vue jeu (infos, étapes, sessions, stats)
/app/games/[id]/edit     Informations
/app/games/[id]/steps    Step Builder
/app/games/[id]/preview  Prévisualisation
/app/games/[id]/generate Génération IA
/app/sessions/[id]       Écran live formateur
/app/sessions/[id]/results  Résultats, classement, compétences
/app/skills              Bibliothèque de compétences
/app/settings            Profil, plan
/admin                   Utilisateurs, jeux, statistiques globales
/api/sessions/[id]/events  SSE
/api/uploads             Upload fichiers
```

## 13. Structure des composants

```
src/components/
  ui/         Button, Card, Input, Textarea, Select, Field, Badge, Pill, Progress,
              Stat, Alert, Modal, Tabs, Kbd, Logo, Container, SectionHeading, Skeleton
  landing/    Hero, HowItWorks, Why, ForTrainers, ForOrganizations, Features,
              ExampleGame, Stats, Pricing, FAQ, FinalCTA, Footer, Nav
  app/        AppShell, Sidebar, TopBar, GameCard, StatusPill, EmptyState
  builder/    GameForm, StepList (dnd), StepEditor, PuzzleEditor/<type>, HintEditor,
              AnswerEditor, UnlockEditor, SkillPicker
  play/       PlayShell, MissionHeader, StepView, PuzzleInput/<type>, HintPanel,
              ProgressRail, Timer, ScoreBadge, FeedbackCard, ResultScreen
  live/       LiveBoard, PlayerTable, TeamBoard, Leaderboard, SessionControls, JoinCodeCard (QR)
```

## 14. Risques techniques

- **SSE derrière certains proxys** (buffering) → headers `X-Accel-Buffering: no`, heartbeat, repli polling.
- **SQLite en prod** non recommandé (concurrence) → Postgres dès la mise en production.
- **Hub mémoire** non partagé entre instances → Redis en Business/Enterprise.
- **Drag & drop accessible** → implémentation clavier (boutons monter/descendre) en plus du DnD.
- **Fichiers volumineux** → limite 20 Mo, stockage objet en prod.

## 15. Fonctionnalités MVP

Création complète (infos, étapes, 10 types d'énigmes, réponses multiples, normalisation, indices avec coût, codes, conditions de déblocage linéaires + code), chronomètre serveur (aucun / global / par étape), sessions avec code + QR, lobby, mode individuel et équipe, live trainer, validation auto (+ manuelle simple), scoring configurable, classement (5 méthodes), feedback, compétences, rapport apprenant + statistiques formateur, badges (6 système), génération IA (stub + provider Anthropic optionnel), démo Excel, landing, auth + rôles, responsive, accessibilité de base, sécurité proportionnée.

## 16. Fonctionnalités reportées après le MVP

Import de cours (PDF/DOCX/PPTX/URL), organisations actives (UI), paiements, embranchements narratifs, énigmes collaboratives multi-joueurs, IA Game Master, SSO, API publique, LMS/SCORM/LTI, QR physiques/AR/IoT, certificats, classement inter-organisations, branding personnalisé, Redis/WebSocket multi-instance.

---

## Ordre de développement (rappel)

PHASE 1 Architecture + design system + landing → PHASE 2 Auth + rôles → PHASE 3 Dashboard → PHASE 4 Création → PHASE 5 Step Builder → PHASE 6 Moteur d'énigmes → PHASE 7 Codes + validation → PHASE 8 Indices → PHASE 9 Progression → PHASE 10 Chronomètre → PHASE 11 Sessions → PHASE 12 Mode apprenant → PHASE 13 Équipes → PHASE 14 Score + classement → PHASE 15 Rapports → PHASE 16 Badges → PHASE 17 IA → PHASE 18 Démo Excel → PHASE 19 Responsive + a11y → PHASE 20 Sécurité + perf + tests.
