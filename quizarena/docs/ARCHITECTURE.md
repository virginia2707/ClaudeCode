# QuizArena — Architecture technique

> « Turn learning into a competition. »

Ce document est la sortie de l'étape **R — Research / T — Think** de la méthode RTFTC.
Il fixe les décisions structurantes avant le code. Les règles de score détaillées
sont dans [SCORING.md](./SCORING.md).

---

## 1. Architecture technique recommandée

### Stack

| Couche | Choix | Pourquoi |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, TypeScript) | Un seul projet full-stack : pages, Server Actions, Route Handlers. Déployable sur n'importe quel hôte Node. |
| Style | **Tailwind CSS v4** + tokens CSS (`globals.css`) | Design system léger, thème sombre premium, animations désactivables (`prefers-reduced-motion` + réglage utilisateur). |
| Base de données | **Prisma 6** + **SQLite** (dev) → **PostgreSQL** (prod) | Zéro infra pour démarrer ; bascule vers Postgres = changement de `provider`. |
| Auth | Cookie httpOnly signé (**jose**, JWT HS256) + **bcryptjs** | Aucun fournisseur tiers ; compatible runtime Edge (proxy) et Node. |
| Validation | **Zod** | Validation côté serveur de toutes les entrées (Server Actions + API). |
| Temps réel | **SSE (Server-Sent Events)** + bus d'événements serveur, repli en polling | Push serveur→client sans serveur custom ni WebSocket. Le client n'envoie que des POST. |
| IA | `AIService` avec interface `AIProvider` (`stub` hors-ligne, `anthropic` optionnel) | Aucune dépendance à un fournisseur unique ; clés uniquement côté serveur. |
| Tests | **Vitest** (unitaires + intégration sur SQLite temporaire) | Le scoring et le moteur de partie sont testés avec cas limites. |

### Principes

1. **Le serveur est la source de vérité.** Statut de partie, question courante, horodatages
   de début/fin de question, réponses et scores sont persistés et calculés côté serveur.
   Le navigateur n'envoie jamais un score : il envoie *une* réponse, le serveur mesure le
   temps et calcule.
2. **Horloge serveur.** Chaque question porte `startedAt` / `endsAt` (serveur). Le client
   affiche un compte à rebours calculé à partir de ces horodatages et d'un décalage
   `serverTime - clientTime` mesuré à la connexion. Le timer JS n'est que cosmétique.
3. **Idempotence.** Une réponse par joueur et par question (contrainte unique en base).
   Une reconnexion renvoie l'état complet (snapshot) puis les événements incrémentaux.
4. **Extensibilité.** Le bus temps réel est une interface (`RealtimeBus`) ; l'implémentation
   MVP est en mémoire (mono-instance). Une implémentation Redis Pub/Sub peut la remplacer
   sans toucher au moteur.

### Flux temps réel

```
Formateur ──(Server Action: next/pause/end)──▶ GameEngine ──▶ DB
                                                   │
                                                   ├──▶ RealtimeBus.publish(gameId, event)
                                                   │
Apprenant ◀──(SSE /api/games/[id]/events)──────────┘
Apprenant ──(POST /api/games/[id]/answer)──▶ GameEngine.submitAnswer ──▶ ScoringService
```

Événements SSE : `snapshot`, `player_joined`, `player_left`, `question_started`,
`answer_count`, `question_ended` (reveal + feedback), `leaderboard`, `game_finished`,
`game_paused`, `game_resumed`, `heartbeat`.

Fermeture automatique d'une question : un `setTimeout` serveur planifie la clôture à
`endsAt` ; en complément, **toute** requête entrante vérifie paresseusement si
`now > endsAt` et clôture la question (robuste aux redémarrages).

---

## 2. Modèle de données

Voir `prisma/schema.prisma` (source de vérité). Correspondance avec les entités demandées :

| Entité demandée | Implémentation |
|---|---|
| User | `User` (email, hash, nom, rôle, plan, XP total) |
| Role | Champ `User.role` (`TRAINER`, `ADMIN`, `LEARNER`) — liste canonique dans `src/lib/constants.ts` |
| Quiz | `Quiz` + `settings` JSON (temps, points, feedback, jokers, mode, classement…) |
| Question | `Question` (texte, image, explication, difficulté, temps, points, catégorie) |
| Answer | `Answer` (4 par question, une seule `isCorrect` pour le MVP) |
| Skill / QuestionSkill | `Skill` (par formateur) + table de jonction `QuestionSkill` |
| Game | `Game` (code 6 caractères, statut, index courant, horodatages, snapshot de réglages) |
| GamePlayer | `GamePlayer` (pseudo, équipe, score, série, compteurs, jeton de session, connexion) |
| Team | `Team` (nom, couleur, score agrégé) |
| GameQuestion | `GameQuestion` (instance d'une question dans une partie : ordre, startedAt, endsAt) |
| PlayerAnswer | `PlayerAnswer` = **ledger de score** (base, bonus vitesse, bonus série, multiplicateur, total, temps de réponse). Unique par (joueur, question). |
| Score | Dénormalisé sur `GamePlayer.score` / `Team.score` (lecture rapide) ; le détail auditable est `PlayerAnswer`. |
| Streak | `GamePlayer.streak` / `bestStreak` (état courant) ; l'historique se reconstruit depuis `PlayerAnswer`. |
| Joker / PlayerJoker | Types de jokers en constantes (`FIFTY_FIFTY`, `DOUBLE_POINTS`, `EXTRA_TIME`, `SECOND_CHANCE`) ; `PlayerJoker` (stock restant + usage par question). |
| Badge / PlayerBadge | `Badge` (code, critère JSON configurable) + `PlayerBadge` |
| XPTransaction | `XPTransaction` (montant, raison, joueur, utilisateur) |
| GameResult | `GameResult` (rang, score, précision, temps moyen, meilleure série, XP, niveau) — figé en fin de partie |
| QuizResult | `QuizResult` (agrégats par partie : participants, moyenne, médiane, stats par question) |
| Analytics | `AnalyticsEvent` (`quiz_created`, `game_created`, `player_joined`…) |

SQLite ne gère pas les enums Prisma : les valeurs énumérées sont des `String` contrôlées
par Zod et par `src/lib/constants.ts`.

---

## 3. Arborescence du projet

```
quizarena/
├─ docs/                      ARCHITECTURE.md, SCORING.md
├─ prisma/                    schema.prisma, migrations/, seed.ts (quiz de démo)
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx, globals.css, page.tsx (landing)
│  │  ├─ (auth)/login, register
│  │  ├─ (trainer)/dashboard, quizzes/[id]/(edit|settings|preview), games/[id]/(host|report)
│  │  ├─ join/                 rejoindre avec un code
│  │  ├─ play/[gameId]/        écran de jeu apprenant (lobby, question, feedback, podium)
│  │  ├─ profile/, badges/
│  │  └─ api/games/[id]/       events (SSE), state, answer, joker
│  ├─ actions/                 Server Actions (auth, quiz, question, game, host)
│  ├─ components/
│  │  ├─ ui/                   Button, Card, Input, Badge, StatTile, Logo, …
│  │  ├─ landing/              sections de la landing
│  │  ├─ quiz/                 éditeur de quiz / questions / réglages
│  │  ├─ game/                 QuestionCard, AnswerGrid, Timer, Leaderboard, Podium, Jokers
│  │  └─ host/                 écrans formateur pendant la partie
│  ├─ lib/
│  │  ├─ auth/                 session (jose), password (bcrypt), guards
│  │  ├─ db/prisma.ts
│  │  ├─ game/                 scoring.ts, levels.ts, streak.ts, jokers.ts, badges.ts, engine.ts, code.ts
│  │  ├─ realtime/             bus.ts (interface + mémoire), events.ts (types)
│  │  ├─ ai/                   ai-service.ts, providers/{stub,anthropic}.ts
│  │  ├─ validation/           schémas Zod
│  │  ├─ analytics.ts, constants.ts, utils.ts, rate-limit.ts
│  └─ proxy.ts                 garde d'accès (cookie) sur les routes protégées
└─ tests/                     tests d'intégration (moteur de partie sur SQLite temporaire)
```

---

## 4. Principaux parcours utilisateurs

**Formateur**
1. Register → Dashboard.
2. Créer un quiz (titre, description, catégorie, niveau) → ajouter des questions (manuel ou IA,
   toujours relues) → configurer (temps, points, poids de la vitesse, jokers, feedback, mode) →
   prévisualiser → publier.
3. Créer une partie → code à 6 caractères → lobby (participants en direct) → START.
4. Pendant la partie : question courante, temps restant, nombre/répartition des réponses,
   classement → Question suivante / Pause / Terminer.
5. Fin : podium → rapport de partie (statistiques par question, questions à retravailler).

**Apprenant**
1. `/join` → code + pseudo (+ équipe) → salle d'attente.
2. Question → réponse (une seule) → feedback (points, bonus, explication) → classement.
3. Podium final → profil (XP, niveau, badges).

**Démo** : `Try Demo` crée une partie sur le quiz « Les fondamentaux de l'IA » sans compte.

---

## 5. Règles exactes du scoring

Résumé (détails et exemples dans [SCORING.md](./SCORING.md)) :

```
total = (base + speedBonus + streakBonus) × jokerMultiplier   si correct
total = -penalty (0 par défaut)                                si incorrect
speedBonus  = round(maxSpeedBonus × speedWeight × max(0, 1 − elapsed / timeLimit))
streakBonus = table[min(streak, table.length) − 1]  avec table = [0, 50, 100, 150, 250]
```

- Réponse après `endsAt` (+ tolérance réseau 750 ms) → 0 point, série réinitialisée.
- `speedWeight` (0 → 1) permet au formateur de réduire ou neutraliser l'effet vitesse.
- Score d'équipe = somme des scores des membres. XP gagnés = points de la partie.
- Niveaux : Rookie 0–999, Challenger 1 000–2 499, Competitor 2 500–4 999, Master 5 000–9 999,
  Legend 10 000+ (table configurable).

---

## 6. Composants nécessaires

- **UI de base** : `Button`, `Card`, `Input`, `Textarea`, `Select`, `Switch`, `Badge`, `StatTile`,
  `Logo`, `Container`, `EmptyState`, `Alert`, `Progress`.
- **Quiz** : `QuizForm`, `QuestionEditor`, `AnswerEditor`, `QuizSettingsForm`, `QuizPreview`,
  `AIGenerateDialog`.
- **Jeu** : `GameHeader` (question n/N, score, série, temps), `TimerBar`, `QuestionCard`,
  `AnswerGrid`, `JokerBar`, `FeedbackPanel`, `Leaderboard`, `Podium`, `WaitingRoom`.
- **Hôte** : `LobbyPanel`, `HostQuestionView`, `AnswerDistribution`, `HostControls`.
- **Stats** : `GameReport`, `QuestionStatsTable`, `ScoreDistribution`.
- **Hooks** : `useGameStream` (SSE + repli polling + resync), `useServerClock`, `useReducedMotion`.

---

## 7. Risques techniques principaux

| Risque | Mitigation |
|---|---|
| Dérive d'horloge client / timer injuste | Horodatages serveur, offset mesuré, tolérance réseau fixe, calcul du temps côté serveur uniquement. |
| Double réponse / triche | Contrainte unique (joueur, question), cookie de session joueur signé, refus après expiration, score jamais accepté du client. |
| Déconnexions | Snapshot complet à la reconnexion, état persisté en base, `lastSeenAt` + statut de connexion. |
| SSE et hébergement serverless | MVP ciblé sur un serveur Node persistant (`next start`). Interface `RealtimeBus` prête pour Redis ; repli polling automatique côté client. |
| SQLite et concurrence d'écriture | Transactions courtes, `busy_timeout` ; Postgres recommandé en production. |
| Contenu IA non vérifié | Génération = brouillon toujours éditable ; publication manuelle uniquement. |
| Clés API exposées | Uniquement en variables d'environnement serveur ; `AIService` n'est jamais importé côté client. |
| Accessibilité des écrans de jeu | Lettres A/B/C/D + formes, contrastes AA, navigation clavier, `aria-live` pour le timer et le feedback, animations réduites. |

---

## 8. IA — architecture et import de contenu

`AIService` (`src/lib/ai/ai-service.ts`) est le seul point d'entrée utilisé par le reste de
l'application. Il choisit un `AIProvider` (`stub` par défaut, `anthropic` en option) via la
variable d'environnement `AI_PROVIDER` — aucun appelant ne dépend d'un fournisseur précis, et
les clés API ne vivent que côté serveur (`ANTHROPIC_API_KEY`, jamais exposée au client).

Le `StubAIProvider` est déterministe et fonctionne hors-ligne (aucune clé, aucun coût, testable
en CI) : il produit des brouillons de questions structurellement valides à partir du sujet et
des compétences saisis par le formateur. Un `AnthropicProvider` réel appelle l'API Messages et
valide strictement la sortie JSON avant de la renvoyer — la sortie d'un fournisseur n'est jamais
consommée telle quelle. Dans tous les cas, les questions générées sont des **brouillons** :
elles sont présentées à l'écran, modifiables champ par champ, et ne deviennent des questions
réelles du quiz qu'après une action explicite du formateur (« Ajouter au quiz »). Rien n'est
jamais publié automatiquement.

**Import de contenu (PDF/DOCX/PPTX/URL) — architecture prête, non implémentée dans ce MVP.**
`GenerateQuestionsInput` (`src/lib/ai/types.ts`) accepte aujourd'hui un sujet et des compétences
saisis manuellement. L'ajout de l'import de contenu ne demande pas de revoir cette architecture,
seulement de l'alimenter en amont :

```
Fichier (PDF/DOCX/PPTX) ou URL
        │  ContentExtractor.extract(source) → { text, title, sections[] }
        ▼
GenerateQuestionsInput.sourceText (nouveau champ optionnel)
        │  AIService.generateQuestions(input)
        ▼
Brouillons de questions (inchangé) → relecture → ajout manuel au quiz
```

Une interface `ContentExtractor` (une implémentation par format) produirait du texte brut à
partir du document, sans jamais être appelée depuis le client ; `AIProvider.generateQuestions`
recevrait ce texte comme contexte supplémentaire dans le prompt (fournisseur réel) ou comme
source de mots-clés (fournisseur stub). Le contrat « toujours relu, jamais publié
automatiquement » s'applique de la même façon, quelle que soit la source du contenu.

---

## 9. Sécurité et performance — vérifications de la phase 14

Complète le tableau de risques (section 7) après un audit dédié.

### Sécurité

| Contrôle | Implémentation |
|---|---|
| Rate limiting complet | Ajouté aux dernières actions qui en manquaient : création de quiz, création de question (manuelle et IA), création de partie, génération IA (la plus sensible : chaque appel peut interroger un fournisseur payant). S'ajoute aux limites déjà en place (inscription, connexion, rejoindre une partie, réponse, joker, partie démo). |
| CSRF | Les Server Actions bénéficient de la protection native de Next.js (ID d'action chiffrés, vérification d'origine). Les routes `/api/games/[id]/answer` et `/joker` (appelées via `fetch`, pas des Server Actions) ajoutent une vérification explicite d'origine (`isSameOriginRequest`) en défense en profondeur, en plus du cookie de session `sameSite=lax` qui bloque déjà son envoi sur un POST cross-site. |
| Content-Security-Policy | Ajoutée dans `next.config.ts` (politique sans nonce, documentée par Next.js) : `default-src 'self'`, aucun script/frame tiers, `object-src 'none'`, `frame-ancestors 'none'`. Une politique à base de nonce aurait forcé le rendu dynamique de toutes les pages (y compris la landing page), au détriment de la performance. |
| Injections | Aucune requête SQL brute (`$queryRaw`/`$executeRaw`) dans le code, uniquement le client Prisma paramétré. Aucun `dangerouslySetInnerHTML` ni `eval`. |
| Dépendances | `npm audit` : une vulnérabilité haute sévérité dans `deepmerge-ts` (dépendance transitive du CLI `prisma`, jamais exécutée par `@prisma/client` en production) corrigée via `overrides` dans `package.json`, sans changer la version de Prisma utilisée par le projet. |

### Performance

| Constat | Correction |
|---|---|
| Page d'accueil rendue dynamiquement | `AppHeader` (qui lit le cookie de session) était utilisé sur la landing page, empêchant sa génération statique — la page la plus visitée et la plus cachable de l'application. Remplacée par le `SiteHeader` non personnalisé ; la page est de nouveau générée statiquement (`○` dans la sortie de build). |
| Index manquant | `PlayerAnswer` n'avait qu'un index unique `[gamePlayerId, gameQuestionId]`, qui ne sert pas les requêtes filtrant uniquement par `gameQuestionId` (répartition des réponses, comptage à chaque soumission, snapshot SSE) — un chemin critique, appelé à chaque réponse. Ajout de `@@index([gameQuestionId])`. |
| Taille des bundles | Vérifiée après build (~856 Ko de JS client au total, réparti en chunks chargés à la demande par route) : dans la norme pour une application de cette envergure, aucun chunk anormalement volumineux. |

Ces vérifications correspondent à l'étape **C — CHECK** de la méthode RTFTC (sécurité, performance).
