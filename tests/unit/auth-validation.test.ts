import { describe, expect, it } from "vitest";
import { fieldErrors, loginSchema, registerSchema } from "@/lib/validation/auth";

describe("registerSchema", () => {
  const valid = {
    firstName: "  Camille ",
    lastName: "Durand",
    email: " Camille.Durand@Example.COM ",
    password: "Secret123",
    accountType: "TRAINER",
    acceptTerms: true,
  };

  it("accepte une inscription valide et normalise e-mail/prénom", () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("camille.durand@example.com");
      expect(r.data.firstName).toBe("Camille");
      expect(r.data.accountType).toBe("TRAINER");
    }
  });

  it("refuse un mot de passe sans chiffre", () => {
    const r = registerSchema.safeParse({ ...valid, password: "motdepasse" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toMatch(/lettre et un chiffre/);
  });

  it("refuse un mot de passe trop court", () => {
    const r = registerSchema.safeParse({ ...valid, password: "Ab1" });
    expect(r.success).toBe(false);
  });

  it("exige l'acceptation des conditions", () => {
    const r = registerSchema.safeParse({ ...valid, acceptTerms: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).acceptTerms).toBeTruthy();
  });

  it("refuse un rôle non autorisé (ADMIN impossible à l'inscription)", () => {
    const r = registerSchema.safeParse({ ...valid, accountType: "ADMIN" });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("refuse un e-mail invalide", () => {
    const r = loginSchema.safeParse({ email: "pas-un-email", password: "x" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).email).toBe("Adresse e-mail invalide");
  });
  it("exige un mot de passe", () => {
    const r = loginSchema.safeParse({ email: "a@b.co", password: "" });
    expect(r.success).toBe(false);
  });
});
