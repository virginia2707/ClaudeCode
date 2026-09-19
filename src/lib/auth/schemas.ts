import { z } from "zod";
import { ORG_ROLES } from "@/lib/constants";

export const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide.").max(254);
export const passwordSchema = z
  .string()
  .min(10, "10 caractères minimum.")
  .max(128, "128 caractères maximum.")
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), "Utilisez au moins une lettre et un chiffre.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Indiquez votre nom.").max(80),
    email: emailSchema,
    password: passwordSchema,
    accountType: z.enum(["TRAINER", "LEARNER"]),
    organizationName: z.string().trim().max(80).optional().or(z.literal("")),
    inviteToken: z.string().trim().max(128).optional().or(z.literal("")),
  })
  .refine((d) => d.accountType !== "TRAINER" || (d.organizationName && d.organizationName.length >= 2), {
    message: "Indiquez le nom de votre organisation (ou votre nom si vous êtes indépendant).",
    path: ["organizationName"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis.").max(128),
  next: z.string().max(200).optional().or(z.literal("")),
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(ORG_ROLES),
});

export const memberRoleSchema = z.object({
  membershipId: z.string().min(1),
  role: z.enum(ORG_ROLES),
});

export const memberStatusSchema = z.object({
  membershipId: z.string().min(1),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum.").max(80),
});

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  values?: Record<string, string>;
} | undefined;

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Lit un champ de formulaire. Un champ absent du DOM arrive à `null`, que Zod
 * rejette ; on le normalise en chaîne vide pour que les champs facultatifs
 * restent facultatifs.
 */
export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Empêche les redirections ouvertes : n'accepte que des chemins internes. */
export function safeNext(next: string | undefined | null, fallback: string) {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}
