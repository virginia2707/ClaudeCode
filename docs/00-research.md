# MissionIA — R · Research

> Phase R de la méthode RCTFC. Ce document analyse le produit avant toute ligne de code.

## 1. Analyse du produit

### Le problème
Les formations classiques présentent les connaissances avant leur application : `COURS → CHAPITRE 1 → CHAPITRE 2 → QUIZ → CHAPITRE 3 → EXAMEN`. L'apprenant « suit » un cours ; il mémorise, il est rarement mis en situation d'agir. Les conséquences : faible transfert vers le poste de travail, faible engagement, évaluation centrée sur la restitution et non sur la compétence.

### La réponse MissionIA
Inverser la logique : `PROBLÈME → RECHERCHE → APPRENTISSAGE → APPLICATION → FEEDBACK`. Le formateur transforme un contenu existant en **mission professionnelle** : une situation réaliste, un rôle, un problème, des contraintes, des données à analyser, des décisions qui ont des conséquences, des livrables concrets, un feedback qui explique, un bilan de compétences.

Structure d'une mission : `MISSION → BRIEFING → CONTEXTE → OBJECTIF → PROBLÈME → ÉTAPES (action / décision / feedback / ressource / analyse / livrable / évaluation) → MISSION FINALE → BILAN DE COMPÉTENCES`.

### Ce que MissionIA n'est pas
- Pas « ChatGPT qui génère des exercices » : la valeur est dans la scénarisation, le moteur de décisions et conséquences, les livrables et l'évaluation par critères.
- Pas un jeu vidéo : gamification sobre, professionnelle, désactivable.
- Pas une IA autonome : le formateur garde le contrôle éditorial à chaque étape.

### Principes produit (ordre de priorité)
PÉDAGOGIE > GAMIFICATION · APPLICATION > MÉMORISATION PASSIVE · PROBLÈMES RÉELS > QUESTIONS THÉORIQUES · COMPÉTENCES > SCORE · SIMPLICITÉ > COMPLEXITÉ · FIABILITÉ > ANIMATIONS · FORMATEUR AUX COMMANDES > IA AUTONOME.

## 2. Personas

### TRAINER — le formateur (persona principal, acheteur et utilisateur)
Formateur indépendant, enseignant, responsable pédagogique d'un organisme. Possède des contenus (PDF, slides, docs) et peu de temps. Veut des apprenants actifs et des preuves de compétence.
Peut : créer, modifier, importer, générer avec l'IA, créer des étapes, définir compétences, documents, critères ; lancer des sessions ; suivre ; analyser.
Peurs : perdre le contrôle du contenu, IA qui invente, outil trop complexe, apprenants qui trichent.

### LEARNER — l'apprenant
Étudiant, salarié en formation, manager débutant. Sur mobile une partie du temps. Veut comprendre vite « où je suis, ce que je dois faire, pourquoi, avec quoi, pour produire quoi ».
Peut : rejoindre, lire le briefing, analyser, consulter les ressources, décider, répondre, produire, recevoir du feedback, recommencer certaines étapes, suivre ses compétences.

### ADMIN — l'administrateur d'organisation
Responsable de formation, DSI d'école, direction d'organisme. Gère utilisateurs, formateurs, contenus, paramètres ; consulte les statistiques agrégées ; se soucie de l'isolation des données et des coûts IA.

### Hiérarchie cible
`Organization → Admin → Trainers → Learners → Missions → Sessions → Results` (+ Teams pour le mode équipe). Un utilisateur peut avoir des rôles différents dans plusieurs organisations (table `Membership`).

## 3. Proposition de valeur

« Voici mon cours de management de 20 pages » → « Voici une mission professionnelle de 60 minutes permettant à vos apprenants d'utiliser les compétences de ce cours pour résoudre une situation réaliste. »

L'IA propose contexte, scénario, rôle, objectif, problème, données, étapes, décisions, ressources, tâches, livrables, critères, feedback, compétences. Le formateur relit, modifie, prévisualise, valide, publie. Toujours dans cet ordre.

Bénéfices mesurables : temps de conception divisé, engagement (taux de complétion), preuve de compétence (bilan par compétence), pilotage (statistiques par étape et par compétence).

## 4. Fonctionnalités : MVP vs reportées

### MVP (phases 1 à 20)
Création de mission · Briefing immersif · Étapes (drag & drop) · Types d'action : analyse, décision, classement, association, calcul, réponse courte, texte long, création de document, upload, présentation simulée · Données professionnelles (tableau en ligne + fichier) · Ressources (obligatoires / facultatives / débloquées, suivi de consultation) · Décisions et conséquences (moteur de branching linéaire ou branché) · Contraintes et alertes · Livrables avec grille · Évaluation auto / critères / formateur / assistée IA avec validation humaine · Feedback pédagogique · IA Coach à 5 niveaux (activable) · Génération de mission par IA avec review obligatoire · Import de cours simplifié (TXT / copier-coller / PDF texte) · Parcours multi-missions (modèle prêt, UI simple) · Niveaux de difficulté · Progression · XP, badges, niveaux (désactivables, mode « compétences uniquement ») · Score configurable · Mode individuel avec reprise · Mode équipe simplifié · Dashboards apprenant et formateur · Rapport final apprenant · Rapport formateur · Mission finale · Mission démo marketing · Landing page · Plans modélisés (sans paiement).

### Reportées (architecture prête, pas de développement)
Paiement Stripe · Missions adaptatives et difficulté dynamique · IA Game Master, simulation conversationnelle, personnages virtuels (client, manager, RH, hôtel, crise) · Analyse vidéo et orale, scoring comportemental · LMS, SCORM, Moodle, Teams, Google Classroom · API publique · Certificats et portfolio de compétences · SSO · Branding · Temps réel collaboratif riche (édition simultanée) · Import DOCX/PPTX avec mise en page.

## 5. Risques et contraintes

| Risque | Impact | Mitigation |
|---|---|---|
| L'IA génère des missions incohérentes ou fausses | Perte de confiance formateur | Sortie structurée validée par Zod, review obligatoire, prévisualisation, jamais de publication automatique, `confidence` explicite sur les évaluations |
| Fuite des corrigés côté client | Triche, perte de valeur pédagogique | Colonnes `SERVER-ONLY`, DTO apprenant filtrés, évaluation exclusivement serveur |
| Données personnelles envoyées à un fournisseur IA | RGPD, confiance | `AIService` unique avec `redactPII`, pseudonymisation, politique `sendLearnerUploads: false` |
| Complexité du moteur de branching | Bugs, missions bloquées | État persisté serveur (`stateJson`), transitions pures et testées, validation de publication (pas d'étape orpheline, pas de cycle) |
| Surcharge fonctionnelle | MVP qui ne sort jamais | Développement par phases, registre de mécaniques extensible, chaque phase testée |
| Coût IA | Marges | `AIJob` avec tokens et coût, quotas par plan |
| Mobile négligé | Abandon apprenant | Parcours apprenant conçu mobile-first, tests e2e sur viewport mobile |
| Dépendance à un fournisseur IA | Verrouillage | Interface `AIProvider`, provider `stub` déterministe pour dev et tests |

## 6. Expérience pédagogique visée
L'apprenant doit ressentir « je suis dans une vraie situation professionnelle ». Chaque écran répond à : Où suis-je ? Que dois-je faire ? Pourquoi ? Avec quelles ressources ? Pour produire quoi ? Le feedback ne dit jamais seulement « correct / incorrect » : réussite, erreur, explication, conséquence, recommandation. La difficulté se règle par la quantité d'informations, l'ambiguïté, le nombre de décisions, la complexité des données, le nombre de contraintes, le temps et le degré d'autonomie.
