# MissionIA — Plan de développement (RCTFC)

Chaque phase suit : expliquer → développer → tester → identifier → corriger → retester → régressions → documenter. Une fonctionnalité non testée n'est pas terminée (`NOT DONE`).

| Phase | Contenu | Statut |
|---|---|---|
| 1 | Architecture + design system + landing page | **DONE** (voir ci-dessous) |
| 2 | Authentification + rôles + organisations + invitations | **DONE** (voir ci-dessous) |
| 3 | Dashboard Trainer | **DONE** (voir ci-dessous) |
| 4 | Création d'une mission (fiche, scénario, rôle, contraintes) | **DONE** (voir ci-dessous) |
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

## Phase 3 — rapport

### Développé
- **Couche d'accès aux données cloisonnée** (`src/lib/data/`) : chaque lecture et chaque écriture métier passe par un `OrgScope`. Les helpers `missionInScope` et `editableSkillInScope` lèvent une erreur plutôt que de renvoyer l'objet d'une autre organisation, ce qui rend le cloisonnement explicite au lieu de dépendre de la vigilance de chaque requête.
- **Tableau de bord formateur** : compteurs réels (missions par statut, sessions ouvertes, apprenants actifs, compétences), missions et sessions récentes, raccourcis, quota du plan.
- **Liste des missions** : onglets par statut avec compteurs, recherche sur titre, description, secteur et métier, tri (modification, titre, statut), états vides distincts selon qu'un filtre est actif ou non, alerte de quota atteint.
- **Actions sur une mission** : duplication en copie profonde, archivage et restauration, suppression définitive refusée si la mission a déjà été jouée.
- **Copie profonde d'une mission** : scénario, rôle, contraintes, compétences, étapes, tâches, ressources, jeux de données, livrables, grilles d'évaluation, décisions, options et conséquences. Les identifiants internes du moteur (étape suivante, étape débloquée, ressource révélée) sont remappés vers les objets de la copie.
- **Bibliothèque de compétences** : référentiel de l'organisation avec création, modification et suppression, bibliothèque globale MissionIA de huit compétences transverses importables, suppression refusée si la compétence est utilisée.
- **Liste des apprenants** : recherche par nom ou email, activité résumée (missions en cours, terminées).
- **Fixtures de test** (`prisma/fixtures.ts`, jamais chargées en production) : missions complètes permettant de tester l'affichage et la copie profonde avant que le Mission Builder n'existe.

### Testé
- Unitaires (Vitest, 36 tests au total) : analyse des paramètres de la liste (valeurs par défaut, rejet des valeurs inconnues, bornage de la recherche, paramètre répété), construction des liens de filtre, ordres de tri.
- Intégration sur base SQLite jetable : copie profonde complète, remappage du branchement, absence de référence résiduelle vers la mission source, mission source inchangée, refus de dupliquer une mission d'une autre organisation.
- E2E (Playwright, desktop et mobile, 71 tests au total) : tableau de bord, filtres, recherche sur un champ autre que le titre, tri, duplication puis suppression de la copie, archivage et restauration, cycle complet d'une compétence, refus de supprimer une compétence utilisée, import et retrait depuis la bibliothèque globale, recherche d'apprenants, cloisonnement des écrans formateur, accessibilité axe.
- `eslint`, `tsc --noEmit`, `next build` : verts. Suite e2e lancée deux fois de suite sur la même base pour vérifier qu'elle est rejouable.

### Problèmes rencontrés et corrigés
- **Défaut d'autorisation** : la liste des missions et celle des sessions étaient gardées par `mission:read` et `session:read`, permissions que possède aussi un apprenant (il doit pouvoir lire la mission qu'il joue). Un apprenant accédait donc aux écrans d'édition du formateur. Ces pages exigent désormais une permission d'auteur. Le test de cloisonnement couvre les trois écrans.
- **Perte de données à la duplication** : les critères d'évaluation rattachés à une étape ou à un livrable n'ont pas de `missionId` et n'étaient donc pas chargés. Une mission dupliquée perdait silencieusement toute sa grille d'évaluation. Détecté par le test d'intégration, corrigé en chargeant et en recopiant les critères au niveau de l'étape et du livrable.
- **Échec silencieux à la modification d'une compétence** : le formulaire d'édition ne portait pas le champ description ; un champ absent arrive à `null`, que la validation rejette. L'enregistrement échouait sans message exploitable, et aurait effacé la description. Lecture des données de formulaire normalisée (`formString`) et formulaire complété.
- **Éditeur de compétence qui restait ouvert** après enregistrement, masquant la valeur à jour. Il se referme désormais sur succès.
- Tests initialement fragiles : assertions sur des messages transitoires effacés par le rafraîchissement de la liste (remplacées par des assertions sur le résultat réel), sélecteurs par sous-chaîne qui attrapaient aussi la copie d'une mission (remplacés par le titre exact), navigation immédiate après un clic qui annulait l'action serveur en cours, données partagées entre les projets desktop et mobile (chacun a désormais son bac à sable), et test d'import non rejouable sur une base déjà utilisée (il restaure maintenant l'état initial).

### Problèmes restants
- La création de mission n'existe pas encore : les boutons « Nouvelle mission » sont explicitement désactivés jusqu'à la phase 4, et la liste part d'un état vide après un simple `npm run seed`.
- Le lien vers une mission pointe vers `/app/trainer/missions/[id]`, page construite en phase 5 (Mission Builder).
- Les statistiques du tableau de bord sont des compteurs : les taux de complétion, scores moyens et compétences à renforcer arrivent en phase 15, une fois que des apprenants auront joué.
- La page Sessions reste un état vide jusqu'à la phase 14.

## Phase 4 — rapport

### Développé
- **Création d'une mission** : formulaire de fiche (titre, description, secteur, métier, niveau du public, difficulté, durée, mode individuel ou équipe), validation serveur, respect du quota du plan, création en brouillon puis redirection vers la mission.
- **Page de mission** avec six éditeurs : fiche, briefing immersif, rôle de l'apprenant, contraintes, objectifs et évaluation, compétences mobilisées. Chacun est un formulaire autonome, enregistré indépendamment.
- **Briefing immersif** structuré pour répondre aux sept questions attendues : qui, où, quel problème, pourquoi agir, quel délai, quelles contraintes, quel résultat attendu.
- **Contraintes comparables** : intitulé, type, sens de comparaison, valeur et unité. La clé technique utilisée par le moteur est dérivée de l'intitulé, dédoublonnée, et affichée au formateur pour qu'il sache à quoi rattacher les coûts d'une décision.
- **Objectifs pédagogiques** saisis une ligne par objectif, mode d'évaluation (score et compétences, ou compétences uniquement) et activation du coach IA.
- **Compétences** : sélection parmi le référentiel de l'organisation et la bibliothèque globale, avec filtrage serveur de toute compétence n'appartenant pas au périmètre.
- **Liste de préparation avant publication** : ce qui est fait, ce qui manque, et où le compléter.
- **Verrouillage d'une mission publiée** : son contenu est figé côté serveur et neutralisé à l'écran, avec le chemin à suivre (dupliquer ou archiver).
- **Analytics** : premier événement réellement enregistré (`mission_created`), via un module de suivi qui n'échoue jamais l'action métier.

### Testé
- Unitaires (Vitest, 58 tests au total) : schémas de fiche, de scénario et de contrainte (conversion des nombres, bornes, valeurs inconnues, décimales et négatifs), analyse des objectifs (puces, indentation, bornage, aller-retour d'affichage, JSON invalide).
- Intégration sur base jetable : création en brouillon attribuée à l'organisation et à son auteur, champs facultatifs laissés nuls plutôt que vides, dérivation et dédoublonnage des clés de contrainte, refus d'agir sur une mission d'une autre organisation, filtrage des compétences étrangères, remplacement de sélection y compris par une liste vide, absence de doublon sur scénario et rôle, et verrouillage complet d'une mission publiée.
- E2E (Playwright, desktop et mobile, 85 tests au total) : refus d'une fiche invalide avec conservation de la saisie, création puis ouverture de la mission, liste de préparation, persistance après rechargement de tous les éditeurs, clé de contrainte annoncée, suppression d'une contrainte, renommage, cloisonnement pour l'apprenant, mission publiée figée, accessibilité axe.
- `eslint`, `tsc --noEmit`, `next build` : verts. Suite e2e lancée plusieurs fois de suite pour vérifier sa stabilité.

### Problèmes rencontrés et corrigés
- **Défaut d'accessibilité** : l'ancre d'une section et un champ de formulaire portaient le même identifiant. L'association `label`/champ était rompue, et la zone de saisie du briefing n'avait donc aucun nom accessible : un lecteur d'écran l'aurait annoncée sans libellé. Les identifiants de champs sont désormais préfixés par section.
- **Mission publiée modifiable** : rien n'empêchait de changer le contenu d'une mission pendant qu'elle est jouée, ce qui aurait faussé le parcours et l'évaluation des apprenants en cours. Le contenu est maintenant figé, côté serveur comme à l'écran.
- **Puces non retirées** dans les objectifs pédagogiques quand la ligne commençait par une espace. Trouvé par un test unitaire.
- **Suite de tests non déterministe** : un serveur laissé actif après une session de captures d'écran était réutilisé par Playwright, qui testait alors une version obsolète de l'application. La réutilisation de serveur est désormais désactivée.
- Tests initialement fragiles : un motif d'URL qui acceptait aussi la page de création, des lectures dépendant du classement chronologique d'une liste que d'autres tests font varier, et un libellé (« au maximum ») présent à la fois dans une liste et dans les options d'un sélecteur. Les rapports d'accessibilité nomment désormais l'élément fautif, pas seulement la règle.

### Problèmes restants
- La publication reste fermée : elle exige au moins une étape, donc le Mission Builder (phase 5). Le bouton est explicitement désactivé.
- Le versionnement d'une mission publiée n'est pas implémenté : en attendant, la voie prévue est la duplication, et l'écran l'indique.
- Les ressources, jeux de données, étapes, décisions et livrables se créent aux phases 5 à 9 : la page de mission les affichera au fur et à mesure.
- Aucun import de cours ni génération par IA : phases 14 et 16.
