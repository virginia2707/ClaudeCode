import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_ACCESS_CODE } from "../src/lib/seed-constants";

let prisma: PrismaClient;

async function upsertUser(email: string, name: string, role: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

type ChoiceSeed = {
  label: string;
  text: string;
  outcomeText: string;
  coachFeedback: string;
  xpAward: number;
  variableDeltas: Record<string, number>;
  skillDeltas: Record<string, number>; // skill name -> delta, resolved to id at insert time
};

type SituationSeed = {
  title: string;
  description: string;
  difficulty: string;
  timeLimitSeconds?: number;
  choices: ChoiceSeed[];
};

type MissionSeed = {
  dayNumber: number;
  title: string;
  description: string;
  context: string;
  objective: string;
  difficulty: string;
  xpAvailable: number;
  situations: SituationSeed[];
};

const SKILLS = [
  "Communication",
  "Leadership",
  "Organisation",
  "Gestion des conflits",
  "Orientation client",
  "Analyse",
  "Gestion du stress",
];

const MISSIONS: MissionSeed[] = [
  {
    dayNumber: 1,
    title: "Premier jour",
    description: "Une plainte client à gérer dès votre arrivée.",
    context: "Hôtel Aurora, réception, 14h30, forte affluence.",
    objective: "Préserver la relation client tout en mobilisant l'équipe.",
    difficulty: "MEDIUM",
    xpAvailable: 150,
    situations: [
      {
        title: "Une plainte client à la réception",
        description:
          "Il est 14h30. Un client vient à la réception. Il affirme que sa chambre n'a pas été nettoyée correctement et menace de publier un avis négatif. Vous êtes responsable de l'équipe présente à la réception. Que faites-vous ?",
        difficulty: "MEDIUM",
        choices: [
          {
            label: "A",
            text: "Vous présentez immédiatement vos excuses et proposez une solution.",
            outcomeText:
              "Le client accepte votre intervention et accepte de patienter pendant que l'équipe intervient.",
            coachFeedback:
              "Vous avez privilégié l'écoute et la résolution du problème plutôt que la recherche immédiate d'un responsable. Dans ce contexte, cette approche permet de préserver la relation client tout en donnant à l'équipe le temps d'agir.",
            xpAward: 100,
            variableDeltas: {
              customer_satisfaction: 15,
              communication: 10,
              problem_solving: 5,
              company_reputation: 5,
              financial_impact: -2,
            },
            skillDeltas: { Communication: 8, "Gestion des conflits": 6 },
          },
          {
            label: "B",
            text: "Vous expliquez que le problème vient du service housekeeping.",
            outcomeText:
              "Le client se sent renvoyé d'un service à l'autre et hausse le ton ; il menace de laisser un avis négatif immédiatement.",
            coachFeedback:
              "Rejeter la responsabilité sur un autre service face au client fragilise la confiance et le moral de l'équipe visée. Mieux vaut assumer la situation avant d'investiguer en interne.",
            xpAward: 10,
            variableDeltas: { customer_satisfaction: -15, team_morale: -5, communication: -10 },
            skillDeltas: { Communication: -4 },
          },
          {
            label: "C",
            text: "Vous demandez au client d'attendre pendant que vous vérifiez la situation.",
            outcomeText:
              "Le client patiente, un peu agacé, pendant que vous vérifiez rapidement l'état de la chambre auprès du housekeeping.",
            coachFeedback:
              "Vérifier les faits avant d'agir est prudent, mais un client déjà mécontent perçoit aussi l'attente comme un manque de réactivité immédiate.",
            xpAward: 50,
            variableDeltas: { customer_satisfaction: -5, problem_solving: 3, stress_management: 2 },
            skillDeltas: { Organisation: 4, "Gestion du stress": 2 },
          },
          {
            label: "D",
            text: "Vous proposez directement une compensation importante.",
            outcomeText:
              "Le client est satisfait de la compensation, mais le coût financier de la décision est significatif pour l'établissement.",
            coachFeedback:
              "Compenser rapidement rassure le client, mais une compensation disproportionnée avant même de comprendre la situation peut coûter cher et créer un précédent.",
            xpAward: 40,
            variableDeltas: { customer_satisfaction: 10, financial_impact: -15, company_reputation: 2 },
            skillDeltas: { "Orientation client": 6 },
          },
        ],
      },
    ],
  },
  {
    dayNumber: 2,
    title: "Une équipe sous pression",
    description: "Un collaborateur clé est absent au pire moment.",
    context: "6h45, ouverture à 7h, un groupe de tour-opérateur attendu à 8h.",
    objective: "Réorganiser l'équipe sans dégrader le service.",
    difficulty: "MEDIUM",
    xpAvailable: 150,
    situations: [
      {
        title: "Absence de dernière minute",
        description:
          "Le réceptionniste du matin vous appelle à 6h45 : il est malade et ne viendra pas. Le service ouvre à 7h et un groupe de 40 personnes arrive à 8h. Que faites-vous ?",
        difficulty: "MEDIUM",
        choices: [
          {
            label: "A",
            text: "Réorganiser immédiatement les tâches avec l'équipe présente et prioriser l'accueil du groupe.",
            outcomeText: "L'équipe s'adapte rapidement et le groupe est accueilli sans retard visible.",
            coachFeedback:
              "Réorganiser vite, avec des priorités claires, est souvent plus efficace que de chercher une solution parfaite qui prendra trop de temps.",
            xpAward: 100,
            variableDeltas: { team_morale: 10, operational_performance: 10 },
            skillDeltas: { Leadership: 8, Organisation: 6 },
          },
          {
            label: "B",
            text: "Appeler un collègue en repos pour venir en urgence.",
            outcomeText: "Un collègue accepte de venir avec 45 minutes de retard, moyennant une prime.",
            coachFeedback: "Solliciter du renfort est une option valable, mais elle a un coût et ne règle pas l'ouverture immédiate.",
            xpAward: 60,
            variableDeltas: { operational_performance: 5, financial_impact: -5, team_morale: -3 },
            skillDeltas: { Communication: 5 },
          },
          {
            label: "C",
            text: "Gérer seul le service sans réorganiser l'équipe.",
            outcomeText: "Le service devient chaotique dès l'arrivée du groupe et plusieurs clients attendent longuement.",
            coachFeedback: "Vouloir tout absorber seul sans déléguer expose l'équipe et les clients à un risque élevé de désorganisation.",
            xpAward: 10,
            variableDeltas: { operational_performance: -15, team_morale: -10, stress_management: -10 },
            skillDeltas: {},
          },
          {
            label: "D",
            text: "Retarder l'ouverture du service de 30 minutes.",
            outcomeText: "Le groupe attend devant une réception fermée ; plusieurs clients expriment leur mécontentement.",
            coachFeedback: "Retarder l'ouverture reporte le problème et dégrade directement l'expérience client.",
            xpAward: 5,
            variableDeltas: { customer_satisfaction: -20, company_reputation: -10 },
            skillDeltas: {},
          },
        ],
      },
    ],
  },
  {
    dayNumber: 3,
    title: "Le problème de réservation",
    description: "Une même chambre a été réservée deux fois.",
    context: "Deux clients VIP arrivent le même soir pour la même chambre.",
    objective: "Résoudre le conflit de réservation sans perdre les deux clients.",
    difficulty: "HARD",
    xpAvailable: 150,
    situations: [
      {
        title: "Double réservation",
        description:
          "Le système montre qu'une même chambre a été réservée deux fois pour la même nuit. Les deux clients sont des habitués importants de l'hôtel. Que faites-vous ?",
        difficulty: "HARD",
        choices: [
          {
            label: "A",
            text: "Contacter immédiatement les deux clients pour expliquer la situation et proposer un surclassement gratuit à l'un d'eux.",
            outcomeText: "Les deux clients apprécient la transparence et l'un accepte le surclassement avec satisfaction.",
            coachFeedback: "Communiquer vite et proposer une solution concrète limite l'impact d'une erreur opérationnelle.",
            xpAward: 100,
            variableDeltas: { customer_satisfaction: 10, financial_impact: -8, problem_solving: 8 },
            skillDeltas: { Communication: 6, Analyse: 4 },
          },
          {
            label: "B",
            text: "Attendre de voir qui arrive en premier et gérer sur le moment.",
            outcomeText: "La situation devient tendue à la réception lorsque le second client arrive.",
            coachFeedback: "Attendre sans agir en amont transforme un problème gérable en confrontation publique.",
            xpAward: 20,
            variableDeltas: { customer_satisfaction: -10, stress_management: -10 },
            skillDeltas: {},
          },
          {
            label: "C",
            text: "Annuler l'une des deux réservations sans prévenir le client concerné.",
            outcomeText: "Le client découvre l'annulation à son arrivée et exige des explications immédiates.",
            coachFeedback: "Annuler sans prévenir supprime toute possibilité de gérer la situation avec tact.",
            xpAward: 5,
            variableDeltas: { customer_satisfaction: -20, company_reputation: -15 },
            skillDeltas: {},
          },
          {
            label: "D",
            text: "Trouver une chambre équivalente dans un hôtel partenaire, transport offert.",
            outcomeText: "Le client accepte l'alternative, légèrement déçu de ne pas rester à l'Hotel Aurora.",
            coachFeedback: "Une solution externe fonctionne, mais elle a un coût et ne renforce pas la fidélité autant qu'une solution interne.",
            xpAward: 70,
            variableDeltas: { customer_satisfaction: 5, financial_impact: -12, company_reputation: 5 },
            skillDeltas: { "Orientation client": 5 },
          },
        ],
      },
    ],
  },
  {
    dayNumber: 4,
    title: "Les chiffres parlent",
    description: "Analysez les performances du mois et proposez un plan d'action.",
    context: "Réunion avec la direction : taux d'occupation en baisse, satisfaction en hausse, coûts en hausse.",
    objective: "Transformer les données en recommandations concrètes.",
    difficulty: "MEDIUM",
    xpAvailable: 150,
    situations: [
      {
        title: "Revue de performance mensuelle",
        description:
          "Le directeur vous demande d'analyser les chiffres du mois : le taux d'occupation baisse, la satisfaction client augmente, mais les coûts opérationnels augmentent aussi. Vous avez 3 minutes pour présenter une recommandation. Que faites-vous ?",
        difficulty: "MEDIUM",
        timeLimitSeconds: 180,
        choices: [
          {
            label: "A",
            text: "Présenter un plan d'action ciblé basé sur les données, avec des priorités claires.",
            outcomeText: "La direction valide votre plan et vous confie son suivi.",
            coachFeedback: "Structurer une recommandation à partir des données démontre votre capacité d'analyse et de décision.",
            xpAward: 100,
            variableDeltas: { operational_performance: 10, financial_impact: 5 },
            skillDeltas: { Analyse: 10, Leadership: 4 },
          },
          {
            label: "B",
            text: "Présenter les chiffres sans recommandation claire.",
            outcomeText: "La direction apprécie la transparence mais attend davantage de votre part.",
            coachFeedback: "Present des données brutes sans analyse laisse le travail de décision à d'autres.",
            xpAward: 20,
            variableDeltas: {},
            skillDeltas: { Analyse: 2 },
          },
          {
            label: "C",
            text: "Minimiser les problèmes pour ne pas inquiéter la direction.",
            outcomeText: "La direction découvre plus tard l'ampleur réelle des coûts, et la confiance en est affectée.",
            coachFeedback: "Minimiser une difficulté réelle retarde la décision et fragilise votre crédibilité.",
            xpAward: 5,
            variableDeltas: { company_reputation: -5, operational_performance: -5 },
            skillDeltas: {},
          },
          {
            label: "D",
            text: "Demander plus de temps avant de répondre.",
            outcomeText: "La direction accepte, mais la décision est reportée d'une semaine.",
            coachFeedback: "Demander du temps est parfois légitime, mais peut aussi être perçu comme un manque de préparation.",
            xpAward: 10,
            variableDeltas: { stress_management: -5 },
            skillDeltas: {},
          },
        ],
      },
    ],
  },
  {
    dayNumber: 5,
    title: "La crise",
    description: "Une panne majeure survient au pire moment.",
    context: "Panne informatique totale, arrivée d'un groupe VIP, avis négatif publié en ligne.",
    objective: "Gérer plusieurs crises simultanées en gardant le contrôle.",
    difficulty: "EXPERT",
    xpAvailable: 200,
    situations: [
      {
        title: "Crise opérationnelle majeure",
        description:
          "Le système informatique de l'hôtel tombe entièrement en panne au moment où un groupe VIP arrive à la réception, et une critique négative vient d'être publiée en ligne. Vous devez agir vite. Que faites-vous ?",
        difficulty: "EXPERT",
        choices: [
          {
            label: "A",
            text: "Activer le plan de continuité (check-in manuel) et rassurer personnellement le groupe VIP.",
            outcomeText: "Le groupe VIP est accueilli sans interruption visible et complimente la réactivité de l'équipe.",
            coachFeedback: "Garder le contrôle sur le terrain, avec un plan B prêt à l'emploi, est la marque d'un leadership solide en situation de crise.",
            xpAward: 150,
            variableDeltas: { customer_satisfaction: 15, operational_performance: 5, stress_management: 8 },
            skillDeltas: { Leadership: 10, "Gestion du stress": 8 },
          },
          {
            label: "B",
            text: "Attendre que le système revienne en espérant une résolution rapide.",
            outcomeText: "L'attente s'éternise et le groupe VIP patiente debout dans le lobby, visiblement agacé.",
            coachFeedback: "Attendre passivement pendant une crise laisse la situation se dégrader au lieu de la contenir.",
            xpAward: 10,
            variableDeltas: { customer_satisfaction: -15, operational_performance: -15 },
            skillDeltas: {},
          },
          {
            label: "C",
            text: "Déléguer la gestion de la crise à un subordonné sans directives claires.",
            outcomeText: "Le subordonné improvise sans cadre, et la confusion s'installe au sein de l'équipe.",
            coachFeedback: "Déléguer est utile, mais sans direction claire, cela ajoute de l'incertitude au lieu de la réduire.",
            xpAward: 15,
            variableDeltas: { team_morale: -10, operational_performance: -10 },
            skillDeltas: {},
          },
          {
            label: "D",
            text: "Gérer uniquement la panne informatique en ignorant la critique en ligne.",
            outcomeText: "La panne est résolue, mais la critique en ligne continue de circuler sans réponse.",
            coachFeedback: "Une crise opérationnelle et une crise de réputation demandent souvent une réponse en parallèle, pas l'une après l'autre.",
            xpAward: 30,
            variableDeltas: { operational_performance: 5, company_reputation: -15 },
            skillDeltas: {},
          },
        ],
      },
    ],
  },
];

async function main() {
  await upsertUser("admin@apprentice.dev", "Admin The Apprentice", "ADMIN", "Admin1234!");
  const formateur = await upsertUser("formateur@apprentice.dev", "Camille Formateur", "FORMATEUR", "Formateur1234!");
  await upsertUser("apprenant@apprentice.dev", "Alex Apprenant", "APPRENANT", "Apprenant1234!");

  let simulation = await prisma.simulation.findUnique({ where: { accessCode: DEMO_ACCESS_CODE } });
  if (!simulation) {
    simulation = await prisma.simulation.create({
      data: {
        title: "Assistant Manager — Hôtel 4 étoiles",
        job: "Assistant Manager Hôtel",
        company: "Hotel Aurora",
        context: "Hôtel 4 étoiles international, forte affluence, clientèle exigeante.",
        description:
          "Pendant 5 jours virtuels, vous occupez le poste d'Assistant Manager de l'Hotel Aurora et devez résoudre des situations professionnelles réelles : plainte client, absence d'équipe, erreur de réservation, analyse de performance et crise opérationnelle.",
        durationDays: 5,
        status: "PUBLISHED",
        accessCode: DEMO_ACCESS_CODE,
        createdById: formateur.id,
      },
    });
  }
  const simulationId = simulation.id;

  const skillIds = new Map<string, string>();
  for (const [i, name] of SKILLS.entries()) {
    const existing = await prisma.skill.findFirst({ where: { simulationId, name } });
    const skill = existing ?? (await prisma.skill.create({ data: { simulationId, name, order: i } }));
    skillIds.set(name, skill.id);
  }

  const existingMissions = await prisma.mission.count({ where: { simulationId } });
  if (existingMissions === 0) {
    for (const [mIdx, missionSeed] of MISSIONS.entries()) {
      const mission = await prisma.mission.create({
        data: {
          simulationId,
          dayNumber: missionSeed.dayNumber,
          title: missionSeed.title,
          description: missionSeed.description,
          context: missionSeed.context,
          objective: missionSeed.objective,
          difficulty: missionSeed.difficulty,
          xpAvailable: missionSeed.xpAvailable,
          order: mIdx,
        },
      });

      for (const [sIdx, situationSeed] of missionSeed.situations.entries()) {
        const situation = await prisma.situation.create({
          data: {
            missionId: mission.id,
            title: situationSeed.title,
            description: situationSeed.description,
            difficulty: situationSeed.difficulty,
            timeLimitSeconds: situationSeed.timeLimitSeconds ?? null,
            order: sIdx,
          },
        });

        for (const [cIdx, choiceSeed] of situationSeed.choices.entries()) {
          const choice = await prisma.choice.create({
            data: {
              situationId: situation.id,
              label: choiceSeed.label,
              text: choiceSeed.text,
              order: cIdx,
            },
          });

          const skillDeltas: Record<string, number> = {};
          for (const [skillName, delta] of Object.entries(choiceSeed.skillDeltas)) {
            const skillId = skillIds.get(skillName);
            if (skillId) skillDeltas[skillId] = delta;
          }

          await prisma.consequence.create({
            data: {
              choiceId: choice.id,
              outcomeText: choiceSeed.outcomeText,
              coachFeedback: choiceSeed.coachFeedback,
              xpAward: choiceSeed.xpAward,
              variableDeltas: JSON.stringify(choiceSeed.variableDeltas),
              skillDeltas: JSON.stringify(skillDeltas),
            },
          });
        }
      }
    }
  }

  const badgeSpecs = [
    { code: "first_decision", name: "First Decision", icon: "🎯", description: "Première décision prise dans une simulation.", criteriaType: "first_decision", criteriaValue: null as string | null },
    { code: "first_mission", name: "First Mission", icon: "🚀", description: "Première mission terminée.", criteriaType: "first_mission", criteriaValue: null },
    { code: "perfect_mission", name: "Perfect Mission", icon: "⭐", description: "Toutes les meilleures décisions prises sur une mission.", criteriaType: "perfect_mission", criteriaValue: null },
    { code: "crisis_manager", name: "Crisis Manager", icon: "🔥", description: "La mission de crise (jour 5) a été menée à terme.", criteriaType: "mission_complete", criteriaValue: "5" },
    { code: "fast_decision_maker", name: "Fast Decision Maker", icon: "⚡", description: "Une décision prise en moins de 15 secondes.", criteriaType: "fast_decision", criteriaValue: "15" },
    { code: "leadership_apprentice", name: "Leadership Apprentice", icon: "👑", description: "Compétence Leadership ≥ 70.", criteriaType: "skill_threshold", criteriaValue: "Leadership:70" },
    { code: "customer_champion", name: "Customer Champion", icon: "🤝", description: "Compétence Orientation client ≥ 70.", criteriaType: "skill_threshold", criteriaValue: "Orientation client:70" },
    { code: "problem_solver", name: "Problem Solver", icon: "🧩", description: "Compétence Analyse ≥ 70.", criteriaType: "skill_threshold", criteriaValue: "Analyse:70" },
    { code: "strategic_thinker", name: "Strategic Thinker", icon: "🧠", description: "Simulation terminée dans son intégralité.", criteriaType: "simulation_complete", criteriaValue: null },
  ];

  for (const b of badgeSpecs) {
    await prisma.badge.upsert({
      where: { simulationId_code: { simulationId, code: b.code } },
      update: {},
      create: { simulationId, ...b },
    });
  }

  console.log("Seed complete.");
  console.log(`Demo access code: ${DEMO_ACCESS_CODE}`);
  console.log("Accounts: admin@apprentice.dev / Admin1234!, formateur@apprentice.dev / Formateur1234!, apprenant@apprentice.dev / Apprenant1234! (password shared for all demo accounts)");
}

// Exported so it can be called with an already-instantiated PrismaClient
// from src/instrumentation.ts (see src/lib/db-bootstrap.ts for why the
// `prisma` CLI itself can't be relied on at runtime on every host).
export async function runSeed(client: PrismaClient) {
  prisma = client;
  await main();
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const client = new PrismaClient();
  runSeed(client)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await client.$disconnect();
    });
}
