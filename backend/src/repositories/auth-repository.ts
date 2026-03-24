import { query } from "../db";

export type AthleteAuthRecord = {
  id: number;
  name: string;
  email: string | null;
  password_hash: string | null;
};

export async function findAthleteAccountByEmail(email: string) {
  const result = await query<AthleteAuthRecord>(
    `
      SELECT id, name, email, password_hash
      FROM athletes
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function insertAthleteAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
}) {
  const result = await query<AthleteAuthRecord>(
    `
      INSERT INTO athletes (name, email, password_hash, level, favorite_format)
      VALUES ($1, $2, $3, 'Atleta', 'General')
      RETURNING id, name, email, password_hash
    `,
    [input.name, input.email, input.passwordHash]
  );

  return result.rows[0];
}
