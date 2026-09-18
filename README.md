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

Vérifications : `npm run typecheck`, `npm run lint`, `npm run build`.

## Structure

```
docs/ARCHITECTURE.md   recherche, architecture, modèle de données, parcours, moteur
prisma/schema.prisma   modèle de données complet (23 entités)
src/app                pages (App Router)
src/components/ui      design system (boutons, cartes, champs, pills, icônes…)
src/components/landing landing page
src/lib                domaine : constantes, plans, contrat des types d'énigmes, Prisma
legacy/                ancien prototype, exclu du build (supprimable)
```

## Avancement (phases RTFTC)

| Phase | Contenu | État |
|---|---|---|
| R/T | Recherche + architecture | DONE |
| 1 | Architecture + design system + landing page | DONE |
| 2 | Authentification + rôles | à venir |
| 3 → 20 | Dashboard, création, step builder, moteur, sessions, apprenant, équipes, score, rapports, badges, IA, démo, responsive, sécurité | à venir |
