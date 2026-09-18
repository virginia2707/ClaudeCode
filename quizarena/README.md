# QuizArena

> Turn learning into a competition.

QuizArena transforme n'importe quel quiz ou QCM en compétition pédagogique : le formateur
crée un quiz, les apprenants rejoignent avec un code à 6 caractères, les questions
apparaissent simultanément, chaque réponse rapporte des points (rapidité et séries
comprises), le classement évolue en temps réel et la partie se termine par un podium.

## Stack

Next.js 16 (App Router, React 19, TypeScript) · Tailwind CSS v4 · Prisma 6 + SQLite
(Postgres-ready) · cookies signés (jose) + bcryptjs · Zod · SSE pour le temps réel · Vitest.

Architecture, modèle de données, parcours et risques : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
Règles de score : [docs/SCORING.md](docs/SCORING.md).

## Démarrage

```bash
cd quizarena
npm install
cp .env.example .env          # puis remplacez AUTH_SECRET
npx prisma migrate dev        # crée la base SQLite locale
npm run db:seed               # comptes de démo + quiz « Les fondamentaux de l'IA »
npm run dev
```

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Serveur Next.js |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm test` | Tests Vitest (scoring, moteur de partie) |
| `npm run db:migrate` / `db:seed` / `db:reset` | Base de données |

## Avancement par phases

| Phase | Contenu | État |
|---|---|---|
| 1 | Architecture, design system, landing page | ✅ |
| 2 | Authentification, utilisateurs, rôles | ⏳ |
| 3 | Création et édition des quiz | ⏳ |
| 4 | Création d'une partie + code | ⏳ |
| 5 | Lobby temps réel | ⏳ |
| 6 | Moteur de quiz temps réel | ⏳ |
| 7 | Scoring, rapidité, séries | ⏳ |
| 8 | Classement + podium | ⏳ |
| 9 | Jokers | ⏳ |
| 10 | Statistiques | ⏳ |
| 11 | IA | ⏳ |
| 12 | Badges, niveaux, XP | ⏳ |
| 13 | Responsive + accessibilité | ⏳ |
| 14 | Sécurité et performance | ⏳ |
