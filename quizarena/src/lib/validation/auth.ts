import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(200);
export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(128, "128 caractères maximum");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum").max(60, "60 caractères maximum"),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["TRAINER", "LEARNER"]).default("TRAINER"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis").max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
