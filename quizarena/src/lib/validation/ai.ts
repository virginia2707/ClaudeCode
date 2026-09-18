import { z } from "zod";
import { DIFFICULTIES } from "@/lib/constants";

export const generateQuestionsSchema = z.object({
  topic: z.string().trim().min(3, "3 caractères minimum").max(200, "200 caractères maximum"),
  level: z.enum(DIFFICULTIES).default("MEDIUM"),
  count: z.coerce.number().int().min(1, "1 minimum").max(20, "20 maximum"),
  skills: z
    .string()
    .trim()
    .max(500)
    .default("")
    .transform((s) =>
      s
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
});
export type GenerateQuestionsFormInput = z.infer<typeof generateQuestionsSchema>;
