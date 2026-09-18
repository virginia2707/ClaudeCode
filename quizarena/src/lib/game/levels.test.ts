import { describe, expect, it } from "vitest";
import { DEFAULT_LEVELS, levelFor, levelProgress, nextLevel } from "./levels";

describe("levels", () => {
  it("maps XP to the documented thresholds", () => {
    expect(levelFor(0).name).toBe("Rookie");
    expect(levelFor(999).name).toBe("Rookie");
    expect(levelFor(1000).name).toBe("Challenger");
    expect(levelFor(2499).name).toBe("Challenger");
    expect(levelFor(2500).name).toBe("Competitor");
    expect(levelFor(4999).name).toBe("Competitor");
    expect(levelFor(5000).name).toBe("Master");
    expect(levelFor(9999).name).toBe("Master");
    expect(levelFor(10_000).name).toBe("Legend");
    expect(levelFor(1_000_000).name).toBe("Legend");
  });

  it("computes next level and progress", () => {
    expect(nextLevel(0)?.name).toBe("Challenger");
    expect(nextLevel(10_000)).toBeNull();
    expect(levelProgress(500)).toBeCloseTo(0.5);
    expect(levelProgress(10_000)).toBe(1);
    expect(levelProgress(-5)).toBe(0);
  });

  it("accepts a custom configuration", () => {
    const custom = [
      { level: 1, name: "Bronze", minXp: 0 },
      { level: 2, name: "Or", minXp: 100 },
    ];
    expect(levelFor(150, custom).name).toBe("Or");
    expect(DEFAULT_LEVELS).toHaveLength(5);
  });
});
