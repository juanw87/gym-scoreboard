import { z } from "zod";

export const GenderLoadSchema = z.object({
  male: z.number().positive(),
  female: z.number().positive(),
  unit: z.enum(["kg", "lb"])
});

export const CaloriesSchema = z.object({
  male: z.number().positive(),
  female: z.number().positive()
});

export const ExerciseSchema = z.object({
  name: z.string().min(1),

  category: z.enum([
    "load",
    "bodyweight",
    "distance",
    "calories"
  ]),

  reps: z.number().int().positive().optional(),

  load: GenderLoadSchema.optional(),

  distance: z.object({
    distance: z.number().positive().optional(),
    distance_unit: z.enum(["meters", "km"]).optional()
  }).optional(),

  calories: CaloriesSchema.optional()
})
.superRefine((data, ctx) => {
  if (data.category === "load" && !data.load) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Load exercises must include load"
    });
  }

  if (data.category === "distance" && !data.distance) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Distance exercises must include distance"
    });
  }

  if (data.category === "calories" && !data.calories) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Calories exercises must include calories"
    });
  }
});

const AmrapFormatSchema = z.object({
  wod_type: z.literal("amrap"),
  duration: z.number().positive(),

  variant: z.enum(["classic", "increasing"]).default("classic"),

  progression: z.object({
    increment: z.number().positive()
  }).optional()
});

const EmomFormatSchema = z.object({
  wod_type: z.literal("emom"),

  interval_minutes: z.number().positive(),
  total_minutes: z.number().positive(),

  mode: z.enum(["fixed_reps", "max_reps"])
});

const RftFormatSchema = z.object({
  wod_type: z.literal("rft"),

  rounds: z.number().int().positive(),
  time_cap_seconds: z.number().positive().optional()
});

const TabataFormatSchema = z.object({
  wod_type: z.literal("tabata"),

  work_seconds: z.literal(20),
  rest_seconds: z.literal(10),
  rounds: z.literal(8)
});

const LadderFormatSchema = z.object({
  wod_type: z.literal("ladder"),

  type: z.enum(["ascending", "descending", "pyramid"]),
  start_reps: z.number().int().positive(),
  step: z.number().int().positive().default(1),
  max_reps: z.number().int().positive().optional()
});

export const WodFormatSchema = z.discriminatedUnion("wod_type", [
  AmrapFormatSchema,
  EmomFormatSchema,
  RftFormatSchema,
  TabataFormatSchema,
  LadderFormatSchema
]);

export const WodBlockSchema = z.object({
  type: z.literal("wod"),

  title: z.string().min(1).default("WOD"),

  structure: z.object({
    format: WodFormatSchema,

    exercises: z.array(ExerciseSchema).min(1)
  })
});

const LoadConfigSchema = z.object({
  type: z.enum(["percentage", "fixed", "rpe"]),
  value: z.number().positive(),
  unit: z.string().optional()
});

export const StrengthBlockSchema = z.object({
  type: z.enum(["strength", "weightlifting", "gymnastic"]),

  title: z.string(),

  structure: z.object({
    sets: z.number().int().positive(),
    reps: z.number().int().positive(),

    load: LoadConfigSchema.optional(),

    rest_seconds: z.number().positive().optional()
  })
});

export const BlockSchema = z.union([
  StrengthBlockSchema,
  WodBlockSchema
]);

export const CrossfitClassSchema = z.object({
  class: z.object({
    date: z.string(), // podrías usar z.coerce.date()
    name: z.string().min(1),
    blocks: z.array(BlockSchema).min(1)
  })
});

export type CrossfitClassInput = z.infer<typeof CrossfitClassSchema>;
export type WodFormatInput = z.infer<typeof WodFormatSchema>;
export type WodBlockInput = z.infer<typeof WodBlockSchema>;
export type StrengthBlockInput = z.infer<typeof StrengthBlockSchema>;
export type BlockInput = z.infer<typeof BlockSchema>;
export type ExerciseInput = z.infer<typeof ExerciseSchema>;
export type LoadConfigInput = z.infer<typeof LoadConfigSchema>; 
