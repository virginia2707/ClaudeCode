import { z } from "zod";

export const skillSchema = z.object({
  name: z.string().trim().min(2, "2 caractères minimum.").max(60, "60 caractères maximum."),
  description: z.string().trim().max(240, "240 caractères maximum.").optional().or(z.literal("")),
  category: z.string().trim().max(40, "40 caractères maximum.").optional().or(z.literal("")),
});

export const skillIdSchema = z.object({ skillId: z.string().min(1) });
export const missionIdSchema = z.object({ missionId: z.string().min(1) });
