import { PoolClient } from "pg";
import { query } from "../db";

export type RmRecordRow = {
  id: number;
  athlete_id: number;
  exercise_name: string;
  rm_value: string;
  rm_date: string;
  created_at: string;
};

export async function upsertRmRecord(
  client: PoolClient,
  input: {
    athleteId: number;
    exerciseName: string;
    rmValue: number;
    rmDate: string;
  }
) {
  const result = await client.query<RmRecordRow>(
    `
      INSERT INTO rm_records (athlete_id, exercise_name, rm_value, rm_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (athlete_id, exercise_name, rm_date)
      DO UPDATE SET rm_value = EXCLUDED.rm_value
      RETURNING id, athlete_id, exercise_name, rm_value::text, rm_date::text, created_at::text
    `,
    [input.athleteId, input.exerciseName, input.rmValue, input.rmDate]
  );

  return result.rows[0];
}

export async function findRmRecordsByAthlete(athleteId: number) {
  const result = await query<RmRecordRow>(
    `
      SELECT id, athlete_id, exercise_name, rm_value::text, rm_date::text, created_at::text
      FROM rm_records
      WHERE athlete_id = $1
      ORDER BY exercise_name ASC, rm_date DESC, id DESC
    `,
    [athleteId]
  );

  return result.rows;
}
