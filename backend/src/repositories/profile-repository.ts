import { query } from "../db";

export type AthleteProfileRecord = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  name: string;
  email: string | null;
  age: number | null;
  height_cm: string | null;
  weight_kg: string | null;
};

export async function findAthleteProfileById(athleteId: number) {
  const result = await query<AthleteProfileRecord>(
    `
      SELECT
        id,
        first_name,
        last_name,
        name,
        email,
        age,
        height_cm::text,
        weight_kg::text
      FROM athletes
      WHERE id = $1
    `,
    [athleteId]
  );

  return result.rows[0] ?? null;
}

export async function updateAthleteProfile(input: {
  athleteId: number;
  firstName: string;
  lastName: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
}) {
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const result = await query<AthleteProfileRecord>(
    `
      UPDATE athletes
      SET
        name = $2,
        first_name = $3,
        last_name = $4,
        age = $5,
        height_cm = $6,
        weight_kg = $7
      WHERE id = $1
      RETURNING
        id,
        first_name,
        last_name,
        name,
        email,
        age,
        height_cm::text,
        weight_kg::text
    `,
    [
      input.athleteId,
      fullName,
      input.firstName,
      input.lastName,
      input.age,
      input.heightCm,
      input.weightKg
    ]
  );

  return result.rows[0] ?? null;
}
