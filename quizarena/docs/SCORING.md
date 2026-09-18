# QuizArena — Règles de score

Toutes les règles ci-dessous sont implémentées dans `src/lib/game/scoring.ts` (`ScoringService`)
et testées dans `src/lib/game/scoring.test.ts`. Le score est **déterministe** et calculé
**uniquement côté serveur**.

## Paramètres (par quiz, modifiables par le formateur)

| Paramètre | Défaut | Rôle |
|---|---|---|
| `basePoints` | 500 | Points d'une bonne réponse (surchargés par `Question.points`). |
| `maxSpeedBonus` | 500 | Bonus maximal de rapidité. |
| `speedWeight` | 1.0 | Poids de la vitesse (0 = exactitude seule, 1 = bonus complet). |
| `streakEnabled` | true | Active le bonus de série. |
| `streakBonuses` | [0, 50, 100, 150, 250] | Bonus pour une série de 1, 2, 3, 4, 5+ bonnes réponses. |
| `wrongAnswerPenalty` | 0 | Points retirés sur mauvaise réponse (0 par défaut, jamais implicite). |
| `lateToleranceMs` | 750 | Tolérance réseau après `endsAt`. |
| `timePerQuestion` | 20 s | Temps par défaut (surchargé par `Question.timeLimit`). |

## Formule

```
elapsed     = submittedAt − questionStartedAt              (ms, mesuré par le serveur)
timeLimit   = question.timeLimit + extraTime (joker)      (ms)

si elapsed > timeLimit + lateToleranceMs → réponse rejetée : 0 point, série remise à 0

si correct :
  base        = question.points
  speedRatio  = max(0, 1 − elapsed / timeLimit)
  speedBonus  = round(maxSpeedBonus × speedWeight × speedRatio)
  streak      = streakAvant + 1
  streakBonus = streakEnabled ? streakBonuses[min(streak, len) − 1] : 0
  multiplier  = jokerDoublePoints ? 2 : 1
  total       = (base + speedBonus + streakBonus) × multiplier

si incorrect :
  streak = 0
  total  = −wrongAnswerPenalty   (0 par défaut)
```

## Exemples (T = 20 s, base 500, maxSpeedBonus 500, speedWeight 1)

| Situation | base | vitesse | série | total |
|---|---|---|---|---|
| Correct en 3 s, série 1 | 500 | 425 | 0 | **925** |
| Correct en 10 s, série 2 | 500 | 250 | 50 | **800** |
| Correct en 19 s, série 3 | 500 | 25 | 100 | **625** |
| Correct en 3 s, série 5, Double Points | 500 | 425 | 250 | **2 350** |
| Correct à 20,5 s (dans la tolérance) | 500 | 0 | … | 500 + série |
| Correct à 21 s (hors tolérance) | 0 | 0 | 0 | **0** |
| Incorrect | 0 | 0 | reset | **0** |

`speedWeight = 0.3` : la même réponse en 3 s ne rapporte que 128 de bonus vitesse — le formateur
privilégie ainsi l'exactitude.

## Jokers

| Joker | Effet | Quand |
|---|---|---|
| 50/50 | Masque deux mauvaises réponses (choisies côté serveur). | Avant de répondre. |
| Double Points | Prochaine bonne réponse ×2 (multiplicateur sur le total). | Avant de répondre ; consommé même si la réponse est fausse. |
| Extra Time | +10 s sur `timeLimit` pour ce joueur et cette question. | Avant de répondre, avant l'expiration. |
| Second Chance | Autorise une seconde tentative si la première est fausse (le bonus vitesse est calculé sur la 2ᵉ soumission ; la série n'est pas rompue). | Activé avant de répondre. |

## Équipes, XP, niveaux

- `teamScore = Σ score des membres`.
- `xpEarned = score de la partie` (1 point = 1 XP). Les XP s'ajoutent au profil si l'apprenant est connecté.
- Niveaux (table `DEFAULT_LEVELS`, remplaçable) : Rookie 0, Challenger 1 000, Competitor 2 500,
  Master 5 000, Legend 10 000. Les noms sont ludiques et n'ont aucune valeur de qualification.
