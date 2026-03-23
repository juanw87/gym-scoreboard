import { PoolClient } from "pg";
import { pool } from "../db";
import { labelWorkoutType } from "../helpers";

type ScorePayload = {
  athleteId: number;
  scoreDisplay: string;
  scoreValue: number;
  note?: string;
};

type CreateWorkoutInput = {
  title: string;
  workoutDate: string;
  workoutType: "for_time" | "amrap" | "weight";
  rankingOrder: "asc" | "desc";
  description: string;
  sourceImageUrl?: string;
  scores: ScorePayload[];
};

async function calculatePreviousBest(
  client: PoolClient,
  athleteId: number,
  workoutType: string,
  rankingOrder: "asc" | "desc"
) {
  const operator = rankingOrder === "asc" ? "MIN" : "MAX";
  const result = await client.query<{ best_score: number | null }>(
    `
      SELECT ${operator}(score_value) AS best_score
      FROM scores s
      INNER JOIN workouts w ON w.id = s.workout_id
      WHERE s.athlete_id = $1 AND w.workout_type = $2
    `,
    [athleteId, workoutType]
  );

  return result.rows[0]?.best_score ?? null;
}

export async function createWorkout(input: CreateWorkoutInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const workoutResult = await client.query<{ id: number }>(
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

    const workoutId = workoutResult.rows[0].id;
    const sortedScores = [...input.scores].sort((left, right) =>
      input.rankingOrder === "asc"
        ? left.scoreValue - right.scoreValue
        : right.scoreValue - left.scoreValue
    );

    for (let index = 0; index < sortedScores.length; index += 1) {
      const score = sortedScores[index];
      const previousBest = await calculatePreviousBest(
        client,
        score.athleteId,
        input.workoutType,
        input.rankingOrder
      );

      const isPersonalRecord =
        previousBest === null
          ? true
          : input.rankingOrder === "asc"
            ? score.scoreValue < previousBest
            : score.scoreValue > previousBest;

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
          workoutId,
          score.athleteId,
          score.scoreDisplay,
          score.scoreValue,
          score.note ?? "",
          index + 1,
          isPersonalRecord
        ]
      );
    }

    await client.query("COMMIT");

    return {
      workoutId,
      title: input.title,
      workoutTypeLabel: labelWorkoutType(input.workoutType),
      scoreCount: input.scores.length
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
