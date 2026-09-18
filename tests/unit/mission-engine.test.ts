import { describe, expect, it } from "vitest";
import { ACTION_TYPE_REGISTRY, ACTION_TYPES, checkConstraints, formatConstraintAlert } from "@/lib/mission-engine/types";

describe("constraint checks", () => {
  const constraints = [
    { key: "budget", label: "Budget maximum", operator: "MAX" as const, value: 30000, unit: "€" },
    { key: "hours", label: "Délai", operator: "MAX" as const, value: 48, unit: "h" },
    { key: "salesGrowth", label: "Objectif de ventes", operator: "MIN" as const, value: 15, unit: "%" },
  ];

  it("flags a budget overrun with the exact excess", () => {
    const [budget] = checkConstraints({ budget: 38000 }, constraints);
    expect(budget.satisfied).toBe(false);
    expect(budget.delta).toBe(8000);
    expect(formatConstraintAlert(budget).replace(/[\u202f\u00a0]/g, " ")).toBe(
      "Votre proposition dépasse la limite « Budget maximum » de 8 000 €.",
    );
  });

  it("accepts values within limits and ignores unknown cost keys", () => {
    const checks = checkConstraints({ budget: 28000, unknown: 1 }, constraints);
    expect(checks).toHaveLength(1);
    expect(checks[0].satisfied).toBe(true);
  });

  it("handles MIN constraints", () => {
    const [growth] = checkConstraints({ salesGrowth: 10 }, constraints);
    expect(growth.satisfied).toBe(false);
    expect(growth.delta).toBe(5);
  });
});

describe("action type registry", () => {
  it("has a definition for every action type", () => {
    for (const t of ACTION_TYPES) expect(ACTION_TYPE_REGISTRY[t].type).toBe(t);
  });
  it("marks deliverable-producing types consistently", () => {
    expect(ACTION_TYPE_REGISTRY.DOCUMENT.producesDeliverable).toBe(true);
    expect(ACTION_TYPE_REGISTRY.DECISION.producesDeliverable).toBe(false);
  });
});
