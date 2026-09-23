# MissionIA

Plateforme SaaS qui transforme des cours classiques en **parcours pédagogiques basés sur des missions professionnelles** :

`MISSION → PROBLÈME → ANALYSE → DÉCISION → ACTION → LIVRABLE → FEEDBACK → COMPÉTENCES`

L'apprenant est placé dans une situation professionnelle réaliste ; le formateur garde le contrôle éditorial ; l'IA accélère la conception sans jamais publier seule.

## État du projet

Développement par phases (méthode RCTFC). **Phases 1 à 4 terminées** : architecture et design system, authentification et organisations, tableau de bord formateur, puis création et édition d'une mission (fiche, briefing immersif, rôle, contraintes, objectifs, compétences). Voir `docs/03-development-plan.md` pour le détail et les rapports de phase.

| Document | Contenu |
|---|---|
| `docs/00-research.md` | Problème, personas, proposition de valeur, MVP vs reporté, risques |
| `docs/01-architecture.md` | Stack, SaaS, permissions, parcours, moteur de missions, décisions, livrables, évaluation, IA, sécurité, pages, composants |
| `docs/02-data-model.md` | Modèle de données (42 modèles) et règles d'intégrité |
| `docs/03-development-plan.md` | Les 20 phases et les rapports DONE / NOT DONE |

## Stack

Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS v4 + tokens sémantiques · Prisma 5 (SQLite en dev, PostgreSQL en prod) · Vitest · Playwright + axe-core.

## Démarrage

```bash
npm install
cp .env.example .env
npx prisma migrate dev      # crée la base SQLite locale
npm run seed                # comptes de démonstration + bibliothèque de compétences
npm run dev                 # http://localhost:3000
```

Renseignez `AUTH_SECRET` dans `.env` avant de démarrer : l'application refuse de signer une session sans secret d'au moins 16 caractères.

Pages publiques : `/` (landing), `/demo` (aperçu de l'écran apprenant), `/design-system`.
Espace connecté : `/app/trainer`, `/app/learn`, `/app/admin`, `/app/join`.

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|---|---|---|
| Administrateur | `admin@missionia.dev` | `Admin1234!` |
| Formateur | `formateur@missionia.dev` | `Formateur1234!` |
| Apprenant | `apprenant@missionia.dev` | `Apprenant1234!` |

Tous membres de l'organisation de démonstration « NovaSkills Formation ». Le seed ajoute aussi deux comptes réservés aux tests automatisés, jamais créés en production.

## Scripts

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # tests unitaires (Vitest)
npm run build       # build de production
npm run test:e2e    # Playwright (lance `next start` sur le port 3100 ; nécessite un build préalable)
npm run fixtures    # jeux de données de test (missions complètes), hors production
```

En environnement sans téléchargement de navigateur, définissez `PLAYWRIGHT_CHROMIUM_PATH` vers un Chromium existant.

## Structure

```
docs/                    recherche, architecture, modèle de données, plan
prisma/                  schema.prisma + migrations
src/app/                 routes (App Router) — (marketing)/ : landing, demo, design-system, login, register
src/components/ui/       design system (Button, Card, Badge, ProgressBar, SkillList, Field, Alert, Stat…)
src/components/marketing/  header, footer
src/components/auth/     formulaires de connexion, inscription, invitation
src/components/app/      coquille applicative, administration de l'organisation
src/components/trainer/  liste et actions de missions, éditeurs de mission, gestion des compétences
src/components/demo/     aperçu interactif de décision
src/lib/constants.ts     valeurs canoniques (rôles, plans, statuts, types)
src/lib/auth/            sessions JWT, mots de passe, schémas Zod, limitation de débit, jetons
src/lib/data/            accès aux données cloisonné par organisation (missions, compétences, apprenants)
src/lib/authz/           matrice rôles → permissions
src/actions/             server actions (authentification, organisation)
src/lib/mission-engine/  registre des mécaniques, état d'exécution, vérification des contraintes
src/lib/ai/              AIService, AIProvider, filtrage PII
src/lib/analytics/       événements produit et enregistrement
tests/unit, tests/integration, tests/e2e    Vitest (unitaires et intégration), Playwright
legacy/the-apprentice/   ancien prototype conservé pour référence (hors compilation)
```

## Principes produit

PÉDAGOGIE > GAMIFICATION · APPLICATION > MÉMORISATION PASSIVE · PROBLÈMES RÉELS > QUESTIONS THÉORIQUES · COMPÉTENCES > SCORE · SIMPLICITÉ > COMPLEXITÉ · FIABILITÉ > ANIMATIONS · FORMATEUR AUX COMMANDES > IA AUTONOME.
