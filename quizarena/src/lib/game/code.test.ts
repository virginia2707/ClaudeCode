import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, generateCode, isValidCodeFormat, normalizeCode } from "./code";

describe("join codes", () => {
  it("generates 6 characters from the safe alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toHaveLength(6);
      expect(isValidCodeFormat(code)).toBe(true);
    }
  });

  it("never contains ambiguous characters", () => {
    expect(CODE_ALPHABET).not.toMatch(/[0O1IL]/);
  });

  it("normalises user input", () => {
    expect(normalizeCode(" a7k-92p ")).toBe("A7K92P");
    expect(normalizeCode("a7k92p")).toBe("A7K92P");
    // 0 → O and 1/l → I so a typo on ambiguous glyphs still resolves
    expect(normalizeCode("0abc1l")).toBe("OABCII");
    expect(normalizeCode("ABCDEFGH")).toBe("ABCDEF");
  });

  it("is deterministic given a random source", () => {
    expect(generateCode(6, () => 0)).toBe("AAAAAA");
  });
});
