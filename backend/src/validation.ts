import { z } from "zod";

export const createWorkoutSchema = z.object({
  title: z.string().min(2),
  workoutDate: z.string().date(),
  workoutType: z.enum(["for_time", "amrap", "weight"]),
  rankingOrder: z.enum(["asc", "desc"]),
  description: z.string().min(4),
  sourceImageUrl: z.string().url().optional().or(z.literal("")),
  scores: z
    .array(
      z.object({
        athleteId: z.number().int().positive(),
        scoreDisplay: z.string().min(1),
        scoreValue: z.number(),
        note: z.string().optional()
      })
    )
    .min(1)
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
