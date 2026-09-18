# MissionIA — Plan de développement (RCTFC)

Chaque phase suit : expliquer → développer → tester → identifier → corriger → retester → régressions → documenter. Une fonctionnalité non testée n'est pas terminée (`NOT DONE`).

| Phase | Contenu | Statut |
|---|---|---|
| 1 | Architecture + design system + landing page | **DONE** (voir ci-dessous) |
| 2 | Authentification + rôles + organisations + invitations | **DONE** (voir ci-dessous) |
| 3 | Dashboard Trainer | Partiel : coquille et compteurs en place, contenu en phase 3 |
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

## Phase 2 — rapport

### Développé
- **Sessions** : JWT signé (`AUTH_SECRET`) en cookie httpOnly, `SameSite=Lax`, `Secure` en production, durée 30 jours. Le secret est obligatoire : l'application refuse de démarrer une session sans lui.
- **Mots de passe** : bcrypt, coût 12 ; politique de 10 caractères minimum avec au moins une lettre et un chiffre.
- **Inscription** : formateur (création d'une organisation dont il devient administrateur) ou apprenant (sans organisation, orienté vers `/app/join`), avec acceptation d'invitation intégrée au formulaire.
- **Connexion / déconnexion** : message d'erreur identique que le compte existe ou non (pas d'énumération), `lastLoginAt` mis à jour, paramètre `next` validé contre les redirections ouvertes.
- **Organisations** : appartenance multiple (`Membership`), bascule d'organisation, création d'organisation depuis `/app/join`.
- **Invitations** : lien signé valable 14 jours, rôle choisi à l'invitation, acceptation par un compte existant ou par création de compte, révocation, usage unique.
- **Administration** (`/app/admin`) : compteurs de plan, invitation de membres, changement de rôle, activation / désactivation, journal d'audit des huit dernières actions.
- **Protection des routes** : contrôle optimiste du cookie dans `src/proxy.ts`, autorisation réelle par `requirePermission` (pages) et `authorizeAction` (server actions), toujours conjointe au périmètre de l'organisation.
- **Coquille applicative** : navigation par rôle, sélecteur d'organisation, déconnexion, tableaux de bord formateur et apprenant, pages Missions et Sessions en attente de leurs phases.
- **Limitation de débit** : connexion, inscription et invitation, seuils configurables par variables d'environnement.
- **Journal d'audit** : inscription, création d'organisation, invitation, révocation, changement de rôle, activation et désactivation.
- **Seed** : organisation « NovaSkills Formation » et trois comptes de démonstration ; deux comptes de test supplémentaires hors production.

### Testé
- Unitaires (Vitest, 23 tests au total) : normalisation de slug, jetons, schémas d'inscription et de connexion, blocage des redirections ouvertes, limitation de débit (fenêtre, isolation par sujet, lecture de `x-forwarded-for`).
- E2E (Playwright, desktop + mobile, 53 tests au total) : redirection d'une route protégée avec `next`, mot de passe erroné, orientation par rôle, cloisonnement formateur / apprenant / administrateur, blocage d'une redirection externe, renvoi d'un utilisateur connecté hors de `/login`, validation serveur du formulaire d'inscription, création d'organisation par un formateur, refus d'un email déjà utilisé, parcours apprenant sans invitation, invitation complète de bout en bout dans un second navigateur avec lien non réutilisable, protection du dernier administrateur, changement de rôle, désactivation et réactivation, accessibilité axe sur les écrans connectés.
- `eslint`, `tsc --noEmit`, `next build` : verts.

### Problèmes rencontrés et corrigés
- **Défaut responsive** : le halo décoratif des pages d'authentification débordait de 274 px sur mobile faute de rognage. Corrigé par un conteneur `overflow-hidden` ; le test de débordement horizontal couvre désormais ces pages.
- **Limitation de débit trop rigide pour un proxy partagé** : les deux projets Playwright sortant par la même IP épuisaient le quota d'inscription. Les seuils sont devenus configurables, ce qui répond aussi au cas réel d'une salle de formation derrière une IP unique.
- Tests initialement fragiles : sélecteurs ambigus (astérisque « obligatoire » dans les libellés, annonceur de route de Next.js, nom d'organisation rendu deux fois pour le responsive) remplacés par des requêtes par rôle accessible ; le formulaire d'invitation a reçu un nom accessible.
- Interférence entre tests : le changement de rôle mutait un compte de démonstration utilisé par un autre test. Comptes de mutation dédiés par projet et exécution sérielle du groupe d'administration.
- Un serveur de test resté actif sur le port 3100 servait une version obsolète et faisait échouer la suite ; processus arrêté avant relance.

### Problèmes restants
- Aucun envoi d'email : les invitations se transmettent par copie du lien depuis l'écran d'administration. L'intégration d'un fournisseur d'email reste à faire.
- Pas encore de réinitialisation de mot de passe ni de vérification d'adresse email.
- La limitation de débit est en mémoire : valable pour une instance, à remplacer par un adaptateur partagé en déploiement multi-instances.
- Les pages Missions et Sessions sont des états vides assumés, remplis aux phases 4, 5 et 14.
