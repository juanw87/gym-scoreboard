import { PoolClient } from "pg";

export async function insertWorkout(
  client: PoolClient,
  input: {
    title: string;
    workoutDate: string;
    workoutType: string;
    rankingOrder: string;
    description: string;
    sourceImageUrl?: string;
  }
) {
  const result = await client.query<{ id: number }>(
    `
      INSERT INTO workouts (title, workout_date, workout_type, ranking_order, description, source_image_url)
      VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''))
      RETURNING id
    `,
    [
      input.title,
      input.workoutDate,
      input.workoutType,
      input.rankingOrder,
      input.description,
      input.sourceImageUrl ?? ""
    ]
  );

  return result.rows[0].id;
}

export async function findPreviousBestScore(
  client: PoolClient,
  input: {
    athleteId: number;
    workoutType: string;
    rankingOrder: "asc" | "desc";
  }
) {
  const operator = input.rankingOrder === "asc" ? "MIN" : "MAX";
  const result = await client.query<{ best_score: number | null }>(
    `
      SELECT ${operator}(score_value) AS best_score
      FROM scores s
      INNER JOIN workouts w ON w.id = s.workout_id
      WHERE s.athlete_id = $1 AND w.workout_type = $2
    `,
    [input.athleteId, input.workoutType]
  );

  return result.rows[0]?.best_score ?? null;
}

export async function insertScore(
  client: PoolClient,
  input: {
    workoutId: number;
    athleteId: number;
    scoreDisplay: string;
    scoreValue: number;
    note?: string;
    rank: number;
    isPersonalRecord: boolean;
  }
) {
  await client.query(
    `
      INSERT INTO scores (
        workout_id,
        athlete_id,
        score_display,
        score_value,
        note,
        rank,
        is_personal_record
      )
      VALUES ($1, $2, $3, $4, NULLIF($5, ''), $6, $7)
    `,
    [
      input.workoutId,
      input.athleteId,
      input.scoreDisplay,
      input.scoreValue,
      input.note ?? "",
      input.rank,
      input.isPersonalRecord
    ]
  );
}
