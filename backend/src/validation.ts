import { z } from "zod";

const normalizedString = z.string().trim();

export const createWorkoutSchema = z.object({
  title: normalizedString.min(2),
  workoutDate: z.string().date(),
  workoutType: z.enum(["for_time", "amrap", "weight"]),
  rankingOrder: z.enum(["asc", "desc"]),
  description: normalizedString.min(4),
  sourceImageUrl: normalizedString.url().optional().or(z.literal("")),
  scores: z
    .array(
      z.object({
        athleteId: z.number().int().positive(),
        scoreDisplay: normalizedString.min(1),
        scoreValue: z.number(),
        note: normalizedString.optional()
      })
    )
    .min(1)
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
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
