# The Apprentice

Simulation professionnelle gamifiée par IA — transformez un contenu pédagogique en
simulation professionnelle interactive : l'apprenant entre dans un métier, reçoit une
mission, prend des décisions et progresse au fil d'un scénario.

Ce dépôt contient le **MVP fonctionnel** : un formateur peut créer une simulation
complète (métier, compétences, missions, situations, choix, conséquences), la publier,
et un apprenant peut la rejoindre avec un code d'accès, la jouer du début à la fin, et
recevoir un rapport de performance individuel. Le formateur dispose d'un tableau de bord
statistique agrégé.

## Stack technique

- **Next.js 16** (App Router, React 19, Server Actions, TypeScript) — un seul projet
  full-stack : pages, API et logique métier au même endroit, adapté au déploiement web.
- **Prisma + SQLite** — base de données relationnelle, zéro infrastructure externe pour
  démarrer. Basculer vers Postgres en production ne demande qu'un changement de
  `provider`/`url` dans `prisma/schema.prisma`.
- **Tailwind CSS v4** — design system minimal (`src/app/globals.css`) : palette sombre,
  premium, sans esthétique "jeu vidéo pour enfants".
- **jsonwebtoken + bcryptjs** — authentification par session JWT en cookie httpOnly,
  sans dépendance à un fournisseur d'auth tiers.
- **`AIService`** (`src/lib/ai/ai-service.ts`) — une seule interface `AIProvider` sépare
  toute la plateforme d'un fournisseur d'IA donné. Le MVP embarque un `StubAIProvider`
  déterministe (aucune clé API, aucun coût, fonctionne hors-ligne) ; un vrai fournisseur
  (Anthropic, OpenAI, …) peut être branché sans toucher aux appelants.

## Démarrage

```bash
npm install
cp .env.example .env   # puis éditez JWT_SECRET si besoin
npx prisma migrate dev
npm run seed            # crée les comptes de démo + la simulation "Hotel Aurora"
npm run dev
```

### Comptes de démonstration (mot de passe entre parenthèses)

| Rôle       | Email                         | Mot de passe     |
|------------|-------------------------------|-------------------|
| Admin      | admin@apprentice.dev          | `Admin1234!`      |
| Formateur  | formateur@apprentice.dev      | `Formateur1234!`  |
| Apprenant  | apprenant@apprentice.dev      | `Apprenant1234!`  |

Code d'accès de la simulation de démonstration (« Assistant Manager — Hôtel 4
étoiles ») : **`AURORA26`**. La page `/demo` la présente publiquement sans connexion.

## Architecture des données

Voir `prisma/schema.prisma`. SQLite ne supportant pas les enums côté Prisma, les
valeurs de type enum (rôles, statuts, difficultés…) sont des `String` contraintes par
convention — la liste canonique vit dans `src/lib/constants.ts`.

Entités principales : `User`, `Simulation`, `Skill`, `Mission`, `Situation`, `Choice`,
`Consequence`, `Progress` (session de jeu d'un apprenant), `Decision`, `UserSkill`,
`XPTransaction`, `Badge`, `UserBadge`, `Report`, `AIInteraction`.

## Ce qui est fonctionnel (MVP)

- Comptes Admin / Formateur / Apprenant avec routes protégées par rôle.
- Créateur de simulation : métier, contexte, compétences, missions, situations, choix
  (3 à 5 par situation), conséquences (variables business + compétences + XP +
  branchement optionnel vers une autre situation), badges.
- Génération assistée par IA d'un squelette de missions (`✨ Créer avec IA`) — toujours
  modifiable par le formateur, jamais publiée automatiquement.
- Publication avec validation minimale + génération d'un code d'accès.
- Parcours apprenant : rejoindre avec un code, jouer situation par situation, feedback
  immédiat (décision / conséquence / compétences mobilisées / feedback du Coach),
  défis à temps limité avec résolution automatique en cas d'expiration, XP, niveaux de
  jeu, badges, scénario branché (`nextSituationId`).
- Rapport de performance individuel (score, compétences, points forts, axes de
  progression, décisions clés, recommandation) — explicitement présenté comme une
  évaluation pédagogique simulée, jamais une certification.
- Tableau de bord formateur : participants, taux de complétion, score moyen/médian, XP
  moyen, compétences les plus/moins maîtrisées, temps moyen et décision la plus
  fréquente par situation, taux d'abandon.
- Simulation de démonstration complète et jouable : **Assistant Manager — Hôtel 4
  étoiles / Hotel Aurora** (5 jours, 7 compétences, 9 badges).

## Limites connues / prochaines étapes

- Import de contenu (PDF/DOCX/PPTX/URL) : non implémenté, architecture prête à
  recevoir un service d'extraction en amont de `AIService`.
- Facturation (Stripe) : plans `FREE/PRO/BUSINESS/ENTERPRISE` modélisés et appliqués
  (limite de simulations par plan), mais aucune intégration de paiement.
- Événements aléatoires dynamiques : non implémentés (branchement statique via
  `Consequence.nextSituationId` uniquement).
