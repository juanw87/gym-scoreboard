import { PoolClient } from "pg";
import { query, withTransaction } from "../db";
import { HttpError } from "../errors";
import {
  findPreviousBestScore,
  findScoreByWorkoutAndAthlete,
  findWorkoutById,
  insertScore,
  insertWorkout,
  isAthleteSubscribed,
  listScoresByWorkout,
  subscribeAthleteToWorkout,
  unsubscribeAthleteFromWorkout,
  updateScore,
  updateScoreRanking
} from "../repositories/workout-repository";
import { CreateWorkoutInput, SubmitWorkoutScoreInput } from "../validation";

type SubscribedWorkoutRow = {
  id: number;
  title: string;
  description: string;
  workout_date: string;
  workout_type: string;
  score_count: string;
};

function deriveWorkoutType(blocks: CreateWorkoutInput["blocks"]) {
  const [firstBlock] = blocks;

  if (blocks.every((block) => block.type === firstBlock.type)) {
    return firstBlock.type;
  }

  return "for_time";
}

function deriveRankingOrder(blocks: CreateWorkoutInput["blocks"]): "asc" | "desc" {
  return blocks.every((block) => block.type === "amrap") ? "desc" : "asc";
}

function buildWorkoutTitle(input: CreateWorkoutInput) {
  const title = input.blocks.map((block) => block.name).join(" / ").trim();
  return title || `WOD ${input.workoutDate}`;
}

function buildWorkoutDescription(blocks: CreateWorkoutInput["blocks"]) {
  return blocks
    .map((block, blockIndex) => {
      const exercises = block.exercises
        .map((exercise) => {
          const target =
            exercise.targetType === "reps"
              ? `${exercise.reps} reps`
              : [exercise.reps ? `${exercise.reps} reps` : null, `time cap ${exercise.timeCap}`]
                  .filter(Boolean)
                  .join(" / ");

          const loads = [
            exercise.weightMen ? `H ${exercise.weightMen}` : null,
            exercise.weightWomen ? `M ${exercise.weightWomen}` : null,
            exercise.percentRm ? `%RM ${exercise.percentRm}` : null
          ]
            .filter(Boolean)
            .join(" | ");

          return loads ? `${exercise.name} (${target}; ${loads})` : `${exercise.name} (${target})`;
        })
        .join(", ");

      return `Bloque ${blockIndex + 1}: ${block.name} | ${block.type.toUpperCase()} | ${block.rounds} rondas | TC ${block.timeCap} | ${exercises}`;
    })
    .join("\n");
}

async function recalculateWorkoutRanking(
  client: PoolClient,
  input: {
    workoutId: number;
    workoutType: string;
    rankingOrder: "asc" | "desc";
  }
) {
  const existingScores = await listScoresByWorkout(client, input.workoutId);
  const sortedScores = [...existingScores].sort((left, right) =>
    input.rankingOrder === "asc"
      ? left.score_value - right.score_value
      : right.score_value - left.score_value
  );

  for (let index = 0; index < sortedScores.length; index += 1) {
    const score = sortedScores[index];
    const previousBest = await findPreviousBestScore(client, {
      athleteId: score.athlete_id,
      workoutType: input.workoutType,
      rankingOrder: input.rankingOrder,
      excludeWorkoutId: input.workoutId
    });

    const isPersonalRecord =
      previousBest === null
        ? true
        : input.rankingOrder === "asc"
          ? score.score_value < previousBest
          : score.score_value > previousBest;

    await updateScoreRanking(client, {
      scoreId: score.id,
      rank: index + 1,
      isPersonalRecord
    });
  }

  return sortedScores.length;
}

async function verifyAthleteSubscribed(
  client: PoolClient,
  athleteId: number,
  workoutId: number
) {
  const isSubscribed = await isAthleteSubscribed(client, athleteId, workoutId);

  if (!isSubscribed) {
    throw new HttpError(
      403,
      "No estás suscrito a este WOD. Suscribite antes de cargar tu resultado."
    );
  }
}

export async function createWorkout(input: CreateWorkoutInput) {
  return withTransaction(async (client) => {
    const workoutType = deriveWorkoutType(input.blocks);
    const rankingOrder = deriveRankingOrder(input.blocks);
    const title = buildWorkoutTitle(input);
    const description = buildWorkoutDescription(input.blocks);
    const workoutId = await insertWorkout(client, {
      title,
      workoutDate: input.workoutDate,
      workoutType,
      rankingOrder,
      description
    });

    for (const score of input.scores) {
      await insertScore(client, {
        workoutId,
        athleteId: score.athleteId,
        scoreDisplay: score.scoreDisplay,
        scoreValue: score.scoreValue,
        note: score.note,
        rank: 0,
        isPersonalRecord: false
      });
    }

    const scoreCount = await recalculateWorkoutRanking(client, {
      workoutId,
      workoutType,
      rankingOrder
    });

    return {
      workoutId,
      title,
      workoutType,
      scoreCount
    };
  });
}

export async function submitWorkoutScore(
  athleteId: number,
  workoutId: number,
  input: SubmitWorkoutScoreInput
) {
  return withTransaction(async (client) => {
    const workout = await findWorkoutById(client, workoutId);

    if (!workout) {
      throw new HttpError(404, "El WOD seleccionado no existe.");
    }

    await verifyAthleteSubscribed(client, athleteId, workoutId);

    const existingScore = await findScoreByWorkoutAndAthlete(client, {
      workoutId,
      athleteId
    });

    if (existingScore) {
      await updateScore(client, {
        scoreId: existingScore.id,
        scoreDisplay: input.scoreDisplay,
        scoreValue: input.scoreValue,
        note: input.note
      });
    } else {
      await insertScore(client, {
        workoutId,
        athleteId,
        scoreDisplay: input.scoreDisplay,
        scoreValue: input.scoreValue,
        note: input.note,
        rank: 0,
        isPersonalRecord: false
      });
    }

    const scoreCount = await recalculateWorkoutRanking(client, {
      workoutId,
      workoutType: workout.workout_type,
      rankingOrder: workout.ranking_order
    });

    return {
      workoutId: workout.id,
      title: workout.title,
      workoutType: workout.workout_type,
      scoreCount,
      action: existingScore ? "updated" : "created"
    };
  });
}

export async function getSubscribedWorkouts(athleteId: number) {
  const result = await query<SubscribedWorkoutRow>(
    `
      SELECT
        w.id,
        w.title,
        w.description,
        TO_CHAR(w.workout_date, 'YYYY-MM-DD') AS workout_date,
        w.workout_type,
        COUNT(s.id)::text AS score_count
      FROM workouts w
      INNER JOIN workout_subscriptions ws ON ws.workout_id = w.id
      LEFT JOIN scores s ON s.workout_id = w.id
      WHERE ws.athlete_id = $1
      GROUP BY w.id
      ORDER BY w.workout_date DESC, w.id DESC
    `,
    [athleteId]
  );

  return result.rows.map((workout) => ({
    id: workout.id,
    title: workout.title,
    description: workout.description,
    workoutDate: workout.workout_date,
    workoutType: workout.workout_type,
    scoreCount: Number(workout.score_count)
  }));
}

export async function subscribeToWorkout(athleteId: number, workoutId: number) {
  return withTransaction(async (client) => {
    const workout = await findWorkoutById(client, workoutId);

    if (!workout) {
      throw new HttpError(404, "El WOD seleccionado no existe.");
    }

    await subscribeAthleteToWorkout(client, { athleteId, workoutId });

    return {
      workoutId: workout.id,
      title: workout.title,
      workoutType: workout.workout_type
    };
  });
}

export async function unsubscribeFromWorkout(athleteId: number, workoutId: number) {
  return withTransaction(async (client) => {
    await unsubscribeAthleteFromWorkout(client, { athleteId, workoutId });

    return { workoutId };
  });
}

export async function listWorkouts(limit = 50) {
  const result = await query<SubscribedWorkoutRow>(
    `
      SELECT
        w.id,
        w.title,
        w.description,
        TO_CHAR(w.workout_date, 'YYYY-MM-DD') AS workout_date,
        w.workout_type,
        COUNT(s.id)::text AS score_count
      FROM workouts w
      LEFT JOIN scores s ON s.workout_id = w.id
      GROUP BY w.id
      ORDER BY w.workout_date DESC, w.id DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map((workout) => ({
    id: workout.id,
    title: workout.title,
    description: workout.description,
    workoutDate: workout.workout_date,
    workoutType: workout.workout_type,
    scoreCount: Number(workout.score_count)
  }));
}
