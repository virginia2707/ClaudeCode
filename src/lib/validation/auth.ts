import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Adresse e-mail invalide")
  .max(190, "Adresse e-mail trop longue");

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères")
  .max(128, "Mot de passe trop long")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Le mot de passe doit contenir au moins une lettre et un chiffre");

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(60, "Prénom trop long"),
  lastName: z.string().trim().min(1, "Nom requis").max(60, "Nom trop long"),
  email: emailSchema,
  password: passwordSchema,
  accountType: z.enum(["TRAINER", "LEARNER"]).default("TRAINER"),
  acceptTerms: z.literal(true, { error: "Vous devez accepter les conditions d'utilisation" }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Transforme les erreurs zod en map champ → message (premier message par champ). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
