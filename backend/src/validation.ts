import { z } from "zod";

const normalizedString = z.string().trim();

const workoutExerciseSchema = z
  .object({
    name: normalizedString.min(1),
    targetType: z.enum(["reps", "time_cap"]),
    reps: z.number().int().positive().optional(),
    timeCap: normalizedString.optional(),
    weightMen: normalizedString.optional(),
    weightWomen: normalizedString.optional(),
    percentRm: normalizedString.optional()
  })
  .superRefine((exercise, context) => {
    if (exercise.targetType === "reps" && exercise.reps === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reps"],
        message: "Las repeticiones son obligatorias para este ejercicio."
      });
    }

    if (exercise.targetType === "time_cap" && !exercise.timeCap) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["timeCap"],
        message: "El time cap es obligatorio para este ejercicio."
      });
    }
  });

const workoutBlockSchema = z
  .object({
    name: normalizedString.min(1),
    type: z.enum(["for_time", "amrap", "emon", "tabata"]),
    rounds: z.number().int().positive(),
    timeCap: normalizedString.min(1),
    exercises: z.array(workoutExerciseSchema).min(1)
  })
  .superRefine((block, context) => {
    if (block.type === "emon" || block.type === "tabata") {
      block.exercises.forEach((exercise, index) => {
        if (exercise.targetType !== "time_cap") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["exercises", index, "targetType"],
            message: "En este tipo de bloque el ejercicio debe medirse por time cap."
          });
        }
      });
    }
  });

export const createWorkoutSchema = z.object({
  workoutDate: z.string().date(),
  blocks: z.array(workoutBlockSchema).min(1),
  scores: z
    .array(
      z.object({
        athleteId: z.number().int().positive(),
        scoreDisplay: normalizedString.min(1),
        scoreValue: z.number(),
        note: normalizedString.optional()
      })
    )
    .default([])
});

export const submitWorkoutScoreSchema = z.object({
  scoreDisplay: normalizedString.min(1),
  scoreValue: z.number(),
  note: normalizedString.optional()
});

export const loginSchema = z.object({
  email: normalizedString.email("Ingresa un correo electrónico válido."),
  password: z.string().min(1, "Ingresa tu contraseña.")
});

export const registerSchema = z
  .object({
    firstName: normalizedString.min(2, "Ingresa tu nombre."),
    lastName: normalizedString.min(2, "Ingresa tu apellido."),
    email: normalizedString.email("Ingresa un correo electrónico válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    confirmPassword: z.string().min(8, "Repite la contraseña.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"]
  });

export const athleteProfileSchema = z.object({
  firstName: normalizedString.min(2, "Ingresa tu nombre."),
  lastName: normalizedString.min(2, "Ingresa tu apellido."),
  age: z
    .number({
      error: "Ingresa una edad válida."
    })
    .int("Ingresa una edad válida.")
    .positive("Ingresa una edad válida.")
    .max(120, "Ingresa una edad válida.")
    .nullable(),
  heightCm: z
    .number({
      error: "Ingresa una estatura válida."
    })
    .positive("Ingresa una estatura válida.")
    .max(300, "Ingresa una estatura válida.")
    .nullable(),
  weightKg: z
    .number({
      error: "Ingresa un peso válido."
    })
    .positive("Ingresa un peso válido.")
    .max(500, "Ingresa un peso válido.")
    .nullable()
});

export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type SubmitWorkoutScoreInput = z.infer<typeof submitWorkoutScoreSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
