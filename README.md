# MissionIA

Plateforme SaaS qui transforme des cours classiques en **parcours pédagogiques basés sur des missions professionnelles** :

`MISSION → PROBLÈME → ANALYSE → DÉCISION → ACTION → LIVRABLE → FEEDBACK → COMPÉTENCES`

L'apprenant est placé dans une situation professionnelle réaliste ; le formateur garde le contrôle éditorial ; l'IA accélère la conception sans jamais publier seule.

## État du projet

Développement par phases (méthode RCTFC). **Phase 1 terminée** : architecture, design system, landing page. Voir `docs/03-development-plan.md` pour le détail et le rapport de phase.

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
npm run dev                 # http://localhost:3000
```

Pages disponibles en phase 1 : `/` (landing), `/demo` (aperçu de l'écran apprenant), `/design-system`.

## Scripts

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # tests unitaires (Vitest)
npm run build       # build de production
npm run test:e2e    # Playwright (lance `next start` sur le port 3100 ; nécessite un build préalable)
```

En environnement sans téléchargement de navigateur, définissez `PLAYWRIGHT_CHROMIUM_PATH` vers un Chromium existant.

## Structure

```
docs/                    recherche, architecture, modèle de données, plan
prisma/                  schema.prisma + migrations
src/app/                 routes (App Router) — (marketing)/ : landing, demo, design-system, login, register
src/components/ui/       design system (Button, Card, Badge, ProgressBar, SkillList, Field, Alert, Stat…)
src/components/marketing/  header, footer
src/components/demo/     aperçu interactif de décision
src/lib/constants.ts     valeurs canoniques (rôles, plans, statuts, types)
src/lib/authz/           matrice rôles → permissions
src/lib/mission-engine/  registre des mécaniques, état d'exécution, vérification des contraintes
src/lib/ai/              AIService, AIProvider, filtrage PII
src/lib/analytics/       événements produit
tests/unit, tests/e2e    Vitest, Playwright
legacy/the-apprentice/   ancien prototype conservé pour référence (hors compilation)
```

## Principes produit

PÉDAGOGIE > GAMIFICATION · APPLICATION > MÉMORISATION PASSIVE · PROBLÈMES RÉELS > QUESTIONS THÉORIQUES · COMPÉTENCES > SCORE · SIMPLICITÉ > COMPLEXITÉ · FIABILITÉ > ANIMATIONS · FORMATEUR AUX COMMANDES > IA AUTONOME.
