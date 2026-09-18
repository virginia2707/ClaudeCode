import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/auth/slug";
import { shortCode, randomToken } from "@/lib/auth/tokens";
import { loginSchema, registerSchema, safeNext } from "@/lib/auth/schemas";

describe("slugify", () => {
  it("normalise accents, espaces et ponctuation", () => {
    expect(slugify("École Supérieure d'Économie & Gestion")).toBe("ecole-superieure-d-economie-gestion");
  });
  it("retourne un fallback pour une entrée vide", () => {
    expect(slugify("!!!")).toBe("organisation");
  });
});

describe("tokens", () => {
  it("génère des codes courts sans caractères ambigus", () => {
    for (let i = 0; i < 50; i++) expect(shortCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });
  it("génère des tokens uniques url-safe", () => {
    const a = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a).not.toBe(randomToken());
  });
});

describe("schemas", () => {
  it("exige une organisation pour un formateur", () => {
    const r = registerSchema.safeParse({ name: "Ana", email: "ANA@Example.com", password: "motdepasse1", accountType: "TRAINER", organizationName: "" });
    expect(r.success).toBe(false);
  });
  it("normalise l'email et accepte un apprenant sans organisation", () => {
    const r = registerSchema.safeParse({ name: "Ana", email: " ANA@Example.com ", password: "motdepasse1", accountType: "LEARNER" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@example.com");
  });
  it("refuse un mot de passe sans chiffre", () => {
    const r = loginSchema.safeParse({ email: "a@b.fr", password: "" });
    expect(r.success).toBe(false);
    const reg = registerSchema.safeParse({ name: "Ana", email: "a@b.fr", password: "motdepasseseul", accountType: "LEARNER" });
    expect(reg.success).toBe(false);
  });
});

describe("safeNext", () => {
  it("bloque les redirections ouvertes", () => {
    expect(safeNext("https://evil.example", "/app")).toBe("/app");
    expect(safeNext("//evil.example", "/app")).toBe("/app");
    expect(safeNext("/app/admin", "/app")).toBe("/app/admin");
    expect(safeNext("", "/app")).toBe("/app");
  });
});
