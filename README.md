# EscapeClass

Escape games pédagogiques numériques pour la formation professionnelle.

> « Le formateur transforme un cours ou une compétence à acquérir en mission interactive.
> L'apprenant doit résoudre plusieurs énigmes pour progresser, obtenir des codes, débloquer
> des étapes et atteindre une mission finale. »

Le document de recherche et d'architecture (phases R et T de la méthode RTFTC) est dans
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Stack

- **Next.js 16** (App Router, React 19, Server Actions, TypeScript)
- **Prisma 5 + SQLite** en développement (PostgreSQL en production : changer `provider` + `url`)
- **Tailwind CSS v4** + design system par tokens (`src/app/globals.css`)
- Sessions JWT en cookie httpOnly (`jsonwebtoken` + `bcryptjs`), validation `zod`

## Démarrage

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run seed
npm run dev
```

### Comptes de démonstration (créés par `npm run seed`)

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Admin | admin@escapeclass.dev | `Admin1234!` |
| Formateur | formateur@escapeclass.dev | `Formateur1234!` |
| Apprenant | apprenant@escapeclass.dev | `Apprenant1234!` |

### Vérifications

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # tests unitaires (Vitest)
npm run build       # build de production
# E2E (Playwright requis, serveur démarré et base seedée) :
BASE=http://localhost:3000 npm run test:e2e
```

## Structure

```
docs/ARCHITECTURE.md   recherche, architecture, modèle de données, parcours, moteur
prisma/schema.prisma   modèle de données complet (23 entités)
src/app                pages (App Router)
src/components/ui      design system (boutons, cartes, champs, pills, icônes…)
src/components/landing landing page
src/lib/puzzles        registre extensible des 10 types d'énigmes + normalisation des réponses
src/lib/engine         moteur pur : chronomètre, déblocage, progression, score, classement, badges
src/lib/sessions       snapshot de jeu, moteur serveur de session, état live formateur
src/lib/realtime       bus d'événements SSE
src/lib                domaine : constantes, plans, auth (session, gardes, rate limit), validation, Prisma
src/actions            Server Actions (auth, join)
src/proxy.ts           garde optimiste des routes /app et /admin (ex-middleware)
tests/unit             tests Vitest ; tests/e2e : scénarios Playwright
legacy/                ancien prototype, exclu du build (supprimable)
```

## Avancement (phases RTFTC)

| Phase | Contenu | État |
|---|---|---|
| R/T | Recherche + architecture | DONE |
| 1 | Architecture + design system + landing page | DONE |
| 2 | Authentification + rôles (ADMIN / TRAINER / LEARNER), routes protégées, 403, rate limiting | DONE |
| 3 | Dashboard formateur : jeux (filtres, publier, dépublier, dupliquer, archiver, restaurer, supprimer), sessions, compétences, paramètres | DONE |
| 4 | Création / modification d'un Escape Game (formulaire complet), réglages (chronomètre, score, classement, immersion), upload de fichiers | DONE |
| 5 | Step Builder : ajout / duplication / suppression / réordonnancement des étapes, éditeur d'étape complet, 10 types d'énigmes, indices à coût, compétences, prévisualisation | DONE |
| 6 → 10 | Moteur : validation serveur, codes de déblocage, indices à coût, progression, chronomètre serveur (pause, prolongation, expiration) | DONE |
| 11 | Sessions : lancement, snapshot figé, code à 6 caractères, QR code, lobby, pilotage live (pause, reprise, +5 min, fin, indice offert, déblocage, validation manuelle) | DONE |
| 12 | Mode apprenant : rejoindre sans compte, écran mobile-first, temps réel (SSE + repli), feedback, rapport de fin avec compétences et badges | DONE |
| 13 → 20 | Mode équipe, classement, rapports et statistiques, badges, IA, démo Excel, responsive, sécurité | à venir |
