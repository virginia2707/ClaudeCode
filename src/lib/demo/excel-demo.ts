import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { uniqueGameSlug } from "@/lib/games/slug";
import { ensureSkillsByName } from "@/lib/skills";

/**
 * Escape game de démonstration « Mission Excel — Le reporting disparu ».
 * Installé pour chaque nouveau compte formateur : le produit est
 * immédiatement démontrable, sans création préalable.
 *
 * Les données affichées à l'apprenant sont réellement calculables : chaque
 * réponse attendue se déduit du contenu de l'étape.
 */

const DEMO_SLUG_BASE = "mission-excel-le-reporting-disparu";

const CSV_CONTENT = `Reference;Designation;Categorie;Prix unitaire;Quantite vendue
RF-101;Classeur A4;Bureautique;3,20;420
RF-118;Ramette papier;Bureautique;4,75;860
RF-204;Toner laser;Bureautique;68,50;112
RF-231;Agrafeuse métal;Bureautique;12,90;240
RF-305;Chaise ergonomique;Mobilier;149,00;38
RF-312;Bureau réglable;Mobilier;389,00;17
RF-407;Écran 24 pouces;Informatique;179,90;64
RF-412;Station d'accueil;Informatique;96,40;53
`;

type StepSeed = {
  order: number;
  title: string;
  instruction: string;
  content: string;
  unlockCode: string | null;
  points: number;
  recommendedSeconds: number;
  difficulty: string;
  isFinal: boolean;
  successFeedback: string;
  errorFeedback: string;
  explanation: string;
  skill: string;
  puzzle: {
    type: string;
    prompt: string;
    config: Record<string, unknown>;
    answers: unknown[];
    caseSensitive?: boolean;
  };
  hints: { text: string; pointCost: number }[];
};

function buildSteps(fileUrl: string, fileName: string): StepSeed[] {
  return [
    {
      order: 0,
      title: "Le fichier mystérieux",
      instruction:
        "Le tableau des ventes du trimestre est intact, mais la cellule de total a été effacée. Recalculez-la pour obtenir le premier code.",
      content: [
        "Ventes du trimestre (en milliers d'euros)",
        "",
        "Région   | Janvier | Février | Mars",
        "Nord     |     412 |     388 |  455",
        "Sud      |     521 |     470 |  498",
        "Est      |     305 |     342 |  367",
        "Ouest    |     289 |     331 |  351",
        "",
        "La cellule de total général (E6) est vide.",
      ].join("\n"),
      unlockCode: "4729",
      points: 100,
      recommendedSeconds: 300,
      difficulty: "EASY",
      isFinal: false,
      successFeedback: "Total correct. Vous avez reconstitué le chiffre d'affaires du trimestre.",
      errorFeedback: "Ce n'est pas le total attendu. Additionnez d'abord chaque ligne, puis les quatre totaux.",
      explanation:
        "La fonction SOMME accepte une plage entière : =SOMME(B2:D5) additionne les douze cellules d'un coup, sans additionner les totaux intermédiaires deux fois.",
      skill: "SOMME et calculs",
      puzzle: {
        type: "NUMERIC_CODE",
        prompt: "Quel est le total général des ventes du trimestre, toutes régions confondues ?",
        config: { digits: null, tolerance: 0 },
        answers: ["4729"],
      },
      hints: [
        { text: "Commencez par le total de chaque région, ligne par ligne.", pointCost: 10 },
        { text: "Nord = 412 + 388 + 455 = 1255. Faites de même pour les trois autres régions.", pointCost: 20 },
      ],
    },
    {
      order: 1,
      title: "Les données cachées",
      instruction:
        "Le taux de TVA est stocké dans une seule cellule. En recopiant la formule vers le bas, les montants deviennent faux : la référence se décale.",
      content: [
        "Feuille « Facturation »",
        "",
        "B1 : taux de TVA = 0,20",
        "",
        "Ligne | Montant HT (D) | Montant TVA (E)",
        "2     |         1 250  | =D2*B1",
        "3     |           980  | =D3*B2   ← décalage",
        "4     |         1 430  | =D4*B3   ← décalage",
        "",
        "Corrigez l'écriture de la référence au taux de TVA.",
      ].join("\n"),
      unlockCode: "EXCEL",
      points: 100,
      recommendedSeconds: 300,
      difficulty: "MEDIUM",
      isFinal: false,
      successFeedback: "Exact. La référence est désormais figée et la recopie ne la décale plus.",
      errorFeedback: "La référence se décale encore. Que faut-il ajouter pour figer à la fois la colonne et la ligne ?",
      explanation:
        "Le symbole $ fige ce qui le suit : $B fige la colonne, B$1 fige la ligne, $B$1 fige les deux. Une référence absolue reste identique quelle que soit la recopie.",
      skill: "Références relatives et absolues",
      puzzle: {
        type: "SECRET_WORD",
        prompt: "Comment faut-il écrire la référence à la cellule B1 pour qu'elle reste figée lors de la recopie ?",
        config: {},
        answers: ["$B$1", "=$B$1"],
      },
      hints: [
        { text: "Un seul caractère, répété deux fois, suffit à figer une référence.", pointCost: 10 },
        { text: "Il se place devant la lettre de colonne et devant le numéro de ligne.", pointCost: 20 },
      ],
    },
    {
      order: 2,
      title: "L'erreur de formule",
      instruction:
        "Le catalogue des produits vous est remis en pièce jointe. Une ligne du reporting affiche #N/A : le prix unitaire d'une référence n'a pas été retrouvé. Ouvrez le fichier et relevez la valeur exacte.",
      content:
        "La formule du reporting était : =RECHERCHEX(\"RF-204\"; Catalogue!A:A; Catalogue!D:D)\nElle renvoie #N/A parce que la plage de recherche était incorrecte.",
      unlockCode: "REPORTING",
      points: 120,
      recommendedSeconds: 420,
      difficulty: "MEDIUM",
      isFinal: false,
      successFeedback: "Prix unitaire retrouvé. La ligne #N/A est corrigée.",
      errorFeedback: "Ce n'est pas la valeur du catalogue. Ouvrez le fichier joint et cherchez la référence RF-204.",
      explanation:
        "RECHERCHEX(valeur_cherchée ; tableau_recherche ; tableau_renvoyé) renvoie #N/A quand la valeur est absente de la plage de recherche : vérifiez toujours que la plage couvre bien la colonne des références.",
      skill: "Recherche de données (RECHERCHEX)",
      puzzle: {
        type: "FILE_ANALYSIS",
        prompt: "Quel est le prix unitaire de la référence RF-204 (en euros) ?",
        config: { fileUrl, fileName, answerKind: "number", tolerance: 0.01 },
        answers: ["68.50"],
      },
      hints: [
        { text: "Le fichier joint est le catalogue : cherchez la ligne dont la référence est RF-204.", pointCost: 10 },
        { text: "La colonne « Prix unitaire » est la quatrième du fichier.", pointCost: 20 },
      ],
    },
    {
      order: 3,
      title: "Le code final",
      instruction:
        "Le tableau croisé dynamique du reporting a été régénéré. Lisez-le pour obtenir le dernier code d'accès au fichier final.",
      content: [
        "Tableau croisé dynamique — Chiffre d'affaires par catégorie et par région (en euros)",
        "",
        "Catégorie     |  Nord |  Sud |  Est | Ouest",
        "Bureautique   |  2145 | 2380 | 1802 |  1967",
        "Mobilier      |  1320 | 1105 |  980 |  1240",
        "Informatique  |  1875 | 2044 | 1610 |  1733",
        "",
        "Les totaux par ligne n'ont pas été affichés.",
      ].join("\n"),
      unlockCode: "8294",
      points: 130,
      recommendedSeconds: 360,
      difficulty: "MEDIUM",
      isFinal: false,
      successFeedback: "Code obtenu. Le fichier final est déverrouillé.",
      errorFeedback: "Ce n'est pas le total de la catégorie demandée. Additionnez uniquement la ligne Bureautique.",
      explanation:
        "Dans un tableau croisé dynamique, un total de ligne agrège toutes les colonnes d'une même modalité : ici les quatre régions pour la catégorie Bureautique.",
      skill: "Tableau croisé dynamique",
      puzzle: {
        type: "NUMERIC_CODE",
        prompt: "Quel est le chiffre d'affaires total de la catégorie Bureautique, toutes régions confondues ?",
        config: { digits: null, tolerance: 0 },
        answers: ["8294"],
      },
      hints: [
        { text: "Une seule ligne du tableau vous intéresse : Bureautique.", pointCost: 10 },
        { text: "2145 + 2380 = 4525. Ajoutez les deux régions restantes.", pointCost: 20 },
      ],
    },
    {
      order: 4,
      title: "Mission finale — Le reporting rétabli",
      instruction:
        "Le fichier est reconstitué. Avant l'envoi à la direction, une dernière décision professionnelle vous revient.",
      content: [
        "Synthèse du trimestre :",
        "- Chiffre d'affaires total : 4 729 k€",
        "- Catégorie la plus forte : Bureautique (8 294 €)",
        "- Région la plus forte : Sud",
        "- Une ligne du catalogue avait un prix unitaire manquant (RF-204), désormais corrigé.",
      ].join("\n"),
      unlockCode: null,
      points: 150,
      recommendedSeconds: 420,
      difficulty: "MEDIUM",
      isFinal: true,
      successFeedback: "Mission accomplie. Le reporting part à l'heure, avec des données vérifiées et traçables.",
      errorFeedback: "Cette conclusion n'est pas soutenue par les données corrigées. Relisez la synthèse.",
      explanation:
        "Un reporting fiable se contrôle avant envoi : on vérifie les totaux, on documente les corrections apportées et on ne conclut que ce que les données montrent réellement.",
      skill: "Analyse des résultats",
      puzzle: {
        type: "MCQ",
        prompt: "Quelle action clôture correctement le reporting ?",
        config: {
          choices: [
            { id: "a", label: "Envoyer le fichier en signalant la correction du prix unitaire RF-204 et les totaux recalculés." },
            { id: "b", label: "Envoyer le fichier tel quel : les erreurs ont été corrigées, il est inutile de le préciser." },
            { id: "c", label: "Reporter l'envoi au lendemain pour refaire entièrement le tableau croisé dynamique." },
            { id: "d", label: "Envoyer uniquement le total général, sans le détail par catégorie." },
          ],
          multiple: false,
          partialCredit: false,
        },
        answers: [["a"]],
      },
      hints: [{ text: "La traçabilité des corrections fait partie du travail attendu.", pointCost: 10 }],
    },
  ];
}

/** Écrit le catalogue CSV sur disque et enregistre l'Upload correspondant. */
async function createCatalogUpload(ownerId: string) {
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(/*turbopackIgnore: true*/ uploadDir, { recursive: true });
  const storedName = `${randomBytes(16).toString("hex")}.csv`;
  const buffer = Buffer.from(CSV_CONTENT, "utf8");
  await writeFile(/*turbopackIgnore: true*/ path.join(uploadDir, storedName), buffer);
  const upload = await prisma.upload.create({
    data: {
      ownerId,
      originalName: "catalogue-produits.csv",
      storedName,
      mime: "text/csv",
      size: buffer.byteLength,
      url: `/api/files/${storedName}`,
    },
    select: { url: true, originalName: true },
  });
  return upload;
}

/**
 * Crée la démo pour un formateur. Idempotent : ne fait rien si le compte
 * possède déjà une démo.
 */
export async function createDemoGame(ownerId: string): Promise<string | null> {
  const existing = await prisma.escapeGame.findFirst({ where: { ownerId, isDemo: true }, select: { id: true } });
  if (existing) return existing.id;

  const upload = await createCatalogUpload(ownerId);
  const steps = buildSteps(upload.url, upload.originalName);
  const skillNames = steps.map((s) => s.skill);
  const skills = await ensureSkillsByName(ownerId, skillNames);
  const skillIdByName = new Map(skills.map((s) => [s.name, s.id]));
  const slug = await uniqueGameSlug(DEMO_SLUG_BASE);

  const game = await prisma.$transaction(async (tx) => {
    const created = await tx.escapeGame.create({
      data: {
        ownerId,
        title: "Mission Excel — Le reporting disparu",
        slug,
        description:
          "Le reporting mensuel doit partir dans 30 minutes et le fichier contient plusieurs erreurs. Retrouvez les données correctes et débloquez le fichier final.",
        category: "BUREAUTIQUE",
        level: "INTERMEDIATE",
        difficulty: "MEDIUM",
        estimatedMinutes: 30,
        objective:
          "Savoir recalculer un total, figer une référence, retrouver une donnée dans un catalogue, lire un tableau croisé dynamique et conclure sur des données vérifiées.",
        targetSkills: JSON.stringify(skillNames),
        scenario:
          "Il est 16h30. Le reporting mensuel doit être envoyé à la direction à 17h. Mais le fichier Excel contient plusieurs erreurs. Votre mission : identifier les anomalies, corriger les données et récupérer le code permettant de débloquer le fichier final.",
        introduction:
          "Cinq anomalies vous attendent. Chacune se règle avec une compétence Excel précise. Une bonne réponse vous donne un code : il vous servira à ouvrir l'étape suivante.",
        finalMessage:
          "Le reporting est rétabli et transmis à l'heure. Vous avez mobilisé le calcul de totaux, les références absolues, la recherche de données, le tableau croisé dynamique et l'analyse des résultats.",
        mode: "INDIVIDUAL",
        maxParticipants: 30,
        status: "PUBLISHED",
        publishedAt: new Date(),
        isDemo: true,
        settings: {
          create: {
            timerMode: "GLOBAL",
            maxMinutes: 30,
            pauseAllowed: true,
            endOnTimeout: true,
            basePoints: 100,
            timeBonusEnabled: true,
            timeBonusMax: 40,
            noHintBonusEnabled: true,
            noHintBonus: 20,
            streakBonusEnabled: true,
            streakBonus: 10,
            hintPenaltyEnabled: true,
            wrongAnswerPenalty: 0,
            timeoutPenalty: 0,
            leaderboardEnabled: true,
            leaderboardMethod: "PEDAGOGICAL",
            showLiveRanking: true,
            animationsEnabled: true,
          },
        },
      },
      select: { id: true },
    });

    for (const step of steps) {
      const newStep = await tx.gameStep.create({
        data: {
          gameId: created.id,
          order: step.order,
          title: step.title,
          instruction: step.instruction,
          content: step.content,
          fileUrl: step.puzzle.type === "FILE_ANALYSIS" ? upload.url : null,
          fileName: step.puzzle.type === "FILE_ANALYSIS" ? upload.originalName : null,
          unlockCode: step.unlockCode,
          points: step.points,
          recommendedSeconds: step.recommendedSeconds,
          difficulty: step.difficulty,
          isFinal: step.isFinal,
          successFeedback: step.successFeedback,
          errorFeedback: step.errorFeedback,
          explanation: step.explanation,
        },
        select: { id: true },
      });
      const skillId = skillIdByName.get(step.skill);
      await tx.puzzle.create({
        data: {
          stepId: newStep.id,
          type: step.puzzle.type,
          prompt: step.puzzle.prompt,
          config: JSON.stringify(step.puzzle.config),
          caseSensitive: step.puzzle.caseSensitive ?? false,
          answers: { create: step.puzzle.answers.map((value, i) => ({ value: JSON.stringify(value), isPrimary: i === 0 })) },
          hints: { create: step.hints.map((h, i) => ({ order: i, text: h.text, pointCost: h.pointCost, timeCostSeconds: 0 })) },
          skills: skillId ? { create: [{ skillId }] } : undefined,
        },
      });
    }
    return created;
  });

  return game.id;
}
