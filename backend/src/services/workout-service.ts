import { PoolClient } from "pg";
import { withTransaction } from "../db";
import { HttpError } from "../errors";
import {
  findPreviousBestScore,
  findScoreByWorkoutAndAthlete,
  findWorkoutById,
  insertScore,
  insertWorkout,
  listScoresByWorkout,
  updateScore,
  updateScoreRanking
} from "../repositories/workout-repository";
import { CreateWorkoutInput, SubmitWorkoutScoreInput } from "../validation";

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

export async function createWorkout(input: CreateWorkoutInput) {
  return withTransaction(async (client) => {
    const workoutId = await insertWorkout(client, input);

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
      workoutType: input.workoutType,
      rankingOrder: input.rankingOrder
    });

    return {
      workoutId,
      title: input.title,
      workoutType: input.workoutType,
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
