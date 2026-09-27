import { PoolClient } from "pg";

export type WorkoutRecord = {
  id: number;
  title: string;
  workout_type: string;
  ranking_order: "asc" | "desc";
};

export type WorkoutScoreRecord = {
  id: number;
  athlete_id: number;
  score_display: string;
  score_value: number;
  note: string | null;
};

export async function insertWorkout(
  client: PoolClient,
  input: {
    title: string;
    workoutDate: string;
    workoutType: string;
    rankingOrder: "asc" | "desc";
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
    excludeWorkoutId?: number;
  }
) {
  const operator = input.rankingOrder === "asc" ? "MIN" : "MAX";
  const result = await client.query<{ best_score: number | null }>(
    `
      SELECT ${operator}(score_value) AS best_score
      FROM scores s
      INNER JOIN workouts w ON w.id = s.workout_id
      WHERE s.athlete_id = $1
        AND w.workout_type = $2
        AND ($3::int IS NULL OR w.id <> $3)
    `,
    [input.athleteId, input.workoutType, input.excludeWorkoutId ?? null]
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

export async function findWorkoutById(client: PoolClient, workoutId: number) {
  const result = await client.query<WorkoutRecord>(
    `
      SELECT id, title, workout_type, ranking_order
      FROM workouts
      WHERE id = $1
    `,
    [workoutId]
  );

  return result.rows[0] ?? null;
}

export async function findScoreByWorkoutAndAthlete(
  client: PoolClient,
  input: {
    workoutId: number;
    athleteId: number;
  }
) {
  const result = await client.query<WorkoutScoreRecord>(
    `
      SELECT id, athlete_id, score_display, score_value, note
      FROM scores
      WHERE workout_id = $1 AND athlete_id = $2
      ORDER BY id DESC
      LIMIT 1
    `,
    [input.workoutId, input.athleteId]
  );

  return result.rows[0] ?? null;
}

export async function listScoresByWorkout(client: PoolClient, workoutId: number) {
  const result = await client.query<WorkoutScoreRecord>(
    `
      SELECT id, athlete_id, score_display, score_value, note
      FROM scores
      WHERE workout_id = $1
      ORDER BY id ASC
    `,
    [workoutId]
  );

  return result.rows;
}

export async function updateScore(
  client: PoolClient,
  input: {
    scoreId: number;
    scoreDisplay: string;
    scoreValue: number;
    note?: string;
  }
) {
  await client.query(
    `
      UPDATE scores
      SET score_display = $2,
          score_value = $3,
          note = NULLIF($4, '')
      WHERE id = $1
    `,
    [input.scoreId, input.scoreDisplay, input.scoreValue, input.note ?? ""]
  );
}

export async function updateScoreRanking(
  client: PoolClient,
  input: {
    scoreId: number;
    rank: number;
    isPersonalRecord: boolean;
  }
) {
  await client.query(
    `
      UPDATE scores
      SET rank = $2,
          is_personal_record = $3
      WHERE id = $1
    `,
    [input.scoreId, input.rank, input.isPersonalRecord]
  );
}
