import { z } from "zod";

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "El mensaje no puede estar vacío"),
  lang: z.enum(["es", "en"]).default("es"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .optional()
    .default([]),
  sessionId: z.string().uuid().optional(), // el frontend lo mandará una vez lo tenga
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;