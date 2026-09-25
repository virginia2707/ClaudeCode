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
npm test            # 103 tests unitaires (Vitest)
npm run build       # build de production
# E2E (Playwright requis, serveur démarré et base seedée) : 282 vérifications
BASE=http://localhost:3000 npm run test:e2e
```

Les scénarios E2E couvrent l'authentification et les rôles, le tableau de bord,
la création d'un jeu, le Step Builder, une session complète, le mode équipe et
les résultats, la génération IA, la démo Excel, la sécurité et l'anti-triche, et
l'accessibilité (axe-core).

### Sécurité

- Réponses, score, temps et déblocages calculés exclusivement côté serveur ; le
  score stocké est toujours la somme de son journal d'événements.
- Les réponses attendues, les énoncés des étapes verrouillées et le texte des
  indices non débloqués ne sont jamais envoyés au navigateur de l'apprenant.
- Sessions JWT en cookie httpOnly, algorithme épinglé, rôle relu en base.
- Jeton de participant signé et lié à une session, cloisonnement par propriétaire
  sur toutes les ressources formateur.
- Content-Security-Policy, X-Frame-Options, nosniff, Referrer-Policy,
  Permissions-Policy, Cross-Origin-Opener-Policy.
- Upload : liste blanche de types, limite de 20 Mo, nom de stockage aléatoire,
  SVG toujours téléchargé et rendu inerte (`default-src 'none'; sandbox`).
- Limitation de débit sur la connexion, l'inscription, l'entrée en session, les
  réponses, les indices et la génération IA.

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
src/lib/ai             service IA : interface AIProvider, générateur hors-ligne, fournisseur Claude
src/lib/demo           escape game de démonstration « Mission Excel »
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
| 13 | Mode équipe : équipes nommées, progression partagée en temps réel, badge d'équipe | DONE |
| 14 | Score et classement : journal d'événements, 5 méthodes, classement visible par l'apprenant | DONE |
| 15 | Rapports et statistiques : résultats de session, énigmes difficiles, compétences, comparaison de sessions | DONE |
| 16 | Badges : 6 badges système, règles extensibles, attribution automatique et affichage | DONE |
| 17 | Génération IA : abstraction de fournisseur, générateur hors-ligne par défaut, fournisseur Claude optionnel, brouillon toujours relu avant publication | DONE |
| 18 | Démo « Mission Excel — Le reporting disparu » : 5 étapes, 5 compétences, catalogue CSV joint, installée dans chaque compte formateur | DONE |
| 19 | Responsive et accessibilité : audit axe-core WCAG 2.1 AA sur 20 états de page, corrections de contraste et de liens, clavier, zoom 200 %, mouvement réduit | DONE |
| 20 | Sécurité et performance : scénario offensif (36 vérifications), CSP et en-têtes, algorithme JWT épinglé, SVG téléchargé et cloisonné, index de base de données | DONE |
