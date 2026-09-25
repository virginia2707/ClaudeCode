import { describe, expect, it } from "vitest";
import { questionSchema } from "./quiz";

const base = {
  text: "Quelle est la capitale de la France ?",
  answers: ["Paris", "Lyon", "Marseille", "Nice"] as const,
  correctIndex: 0,
};

describe("questionSchema — image accessibility", () => {
  it("accepts a question without an image and no alt text", () => {
    const parsed = questionSchema.safeParse({ ...base, imageUrl: "", imageAlt: "" });
    expect(parsed.success).toBe(true);
  });

  it("rejects an image without alt text", () => {
    const parsed = questionSchema.safeParse({ ...base, imageUrl: "https://example.com/x.png", imageAlt: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path.join(".") === "imageAlt");
      expect(issue).toBeDefined();
    }
  });

  it("accepts an image with alt text", () => {
    const parsed = questionSchema.safeParse({ ...base, imageUrl: "https://example.com/x.png", imageAlt: "Diagramme du cycle de vie du projet" });
    expect(parsed.success).toBe(true);
  });
});
