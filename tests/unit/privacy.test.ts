import { describe, expect, it } from "vitest";
import { redactPII } from "@/lib/ai/privacy";

describe("redactPII", () => {
  it("masks emails and French phone numbers", () => {
    const out = redactPII("Contact : marie.dupont@novatech.fr, 06 12 34 56 78 ou +33 6 12 34 56 78.");
    expect(out).not.toContain("novatech.fr");
    expect(out).not.toContain("06 12 34 56 78");
    expect(out).toContain("[email]");
    expect(out).toContain("[téléphone]");
  });
  it("leaves business figures intact", () => {
    expect(redactPII("Budget : 30 000 € pour 48 heures.")).toBe("Budget : 30 000 € pour 48 heures.");
  });
});
