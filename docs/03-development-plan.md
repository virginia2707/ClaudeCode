# MissionIA — Plan de développement (RCTFC)

Chaque phase suit : expliquer → développer → tester → identifier → corriger → retester → régressions → documenter. Une fonctionnalité non testée n'est pas terminée (`NOT DONE`).

| Phase | Contenu | Statut |
|---|---|---|
| 1 | Architecture + design system + landing page | **DONE** (voir ci-dessous) |
| 2 | Authentification + rôles + organisations + invitations | À faire |
| 3 | Dashboard Trainer | À faire |
| 4 | Création d'une mission (fiche, scénario, rôle, contraintes) | À faire |
| 5 | Mission Builder (étapes, drag & drop, verrouillage, duplication) | À faire |
| 6 | Étapes et tâches (types d'action, graders auto) | À faire |
| 7 | Décisions et conséquences (branching, contraintes) | À faire |
| 8 | Ressources et données (stockage privé, jeux de données, suivi) | À faire |
| 9 | Livrables (texte, upload, versions) | À faire |
| 10 | Évaluation et feedback (auto, critères, formateur) | À faire |
| 11 | Parcours Learner (rejoindre, briefing, écran de mission) | À faire |
| 12 | Progression (reprise, bilan) | À faire |
| 13 | Score + XP + badges (désactivables) | À faire |
| 14 | Sessions + mode équipe simplifié | À faire |
| 15 | Dashboard et statistiques | À faire |
| 16 | IA — génération de missions (import, analyse, review) | À faire |
| 17 | IA Coach (5 niveaux) | À faire |
| 18 | IA — évaluation assistée | À faire |
| 19 | Mission marketing de démonstration (seed complet) | À faire |
| 20 | Responsive + accessibilité + sécurité + tests finaux | À faire |

## Phase 1 — rapport

### Développé
- Documents R/T : `docs/00-research.md`, `docs/01-architecture.md`, `docs/02-data-model.md`, ce plan.
- Schéma Prisma complet (42 modèles) + migration `init_missionia`.
- Contrats d'architecture : `constants.ts`, `authz/permissions.ts`, `analytics/events.ts`, `mission-engine/types.ts` (registre de mécaniques, état d'exécution, vérification de contraintes), `ai/types.ts`, `ai/ai-service.ts`, `ai/privacy.ts`.
- Design system : tokens CSS, typographie, composants `ui/*`, page `/design-system`.
- Landing page `/` : hero, comment ça marche, pourquoi les missions, formateurs, organismes, IA, compétences, statistiques, exemple, tarifs, FAQ, CTA final, footer ; header responsive avec menu mobile accessible.
- `/demo` : aperçu de l'écran apprenant avec décision interactive (conséquence, feedback, alerte de contrainte calculée par le moteur).
- `/login`, `/register` : pages d'attente phase 2 ; page 404 ; favicon ; métadonnées Open Graph.
- Ancien produit « The Apprentice » déplacé dans `legacy/` (hors compilation, hors lint), historique git conservé.

### Testé
- Unitaires (Vitest, 12 tests) : permissions, contraintes, registre de mécaniques, filtrage PII.
- E2E (Playwright, desktop + mobile, 23 tests) : hero et CTA, présence des 11 sections, skip link clavier, FAQ, menu mobile (aria-expanded, Échap), décision démo (option hors budget → alerte, option dans le budget → contrainte respectée, rejouer), 5 pages sans débordement horizontal et sans violation axe sérieuse/critique (WCAG 2.1 AA), 404.
- `eslint`, `tsc --noEmit`, `next build` : verts.
- Captures desktop 1440, tablette 820, mobile 390 vérifiées visuellement.

### Problèmes rencontrés et corrigés
- Suppression des fichiers de l'ancien produit refusée par la politique de l'environnement → déplacement dans `legacy/` par `git mv`.
- Playwright attendait un Chromium plus récent que celui préinstallé → `executablePath` configurable dans `playwright.config.ts`.
- Conflit de version `@types/node` avec Vitest 5 → passage à `@types/node@22`.
- Test de contrainte sensible à l'espace fine insécable du format `fr-FR` → normalisation dans le test.
- Sélecteur Playwright ambigu (« Conséquence ») → `exact: true`.

### Problèmes restants
- Aucune fonctionnalité authentifiée : `/login` et `/register` sont des pages d'attente (phase 2).
- La page `/demo` est un aperçu statique : données, tâches et livrables complets arrivent en phase 19.
- Le fournisseur IA par défaut lève `AI_NOT_CONFIGURED` (phase 16).
- Tarifs affichés à titre indicatif ; pas de paiement (hors MVP).
