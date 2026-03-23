import { withTransaction } from "../db";
import { findPreviousBestScore, insertScore, insertWorkout } from "../repositories/workout-repository";
import { CreateWorkoutInput } from "../validation";

export async function createWorkout(input: CreateWorkoutInput) {
  return withTransaction(async (client) => {
    const workoutId = await insertWorkout(client, input);
    const sortedScores = [...input.scores].sort((left, right) =>
      input.rankingOrder === "asc"
        ? left.scoreValue - right.scoreValue
        : right.scoreValue - left.scoreValue
    );

    for (let index = 0; index < sortedScores.length; index += 1) {
      const score = sortedScores[index];
      const previousBest = await findPreviousBestScore(client, {
        athleteId: score.athleteId,
        workoutType: input.workoutType,
        rankingOrder: input.rankingOrder
      });

      const isPersonalRecord =
        previousBest === null
          ? true
          : input.rankingOrder === "asc"
            ? score.scoreValue < previousBest
            : score.scoreValue > previousBest;

      await insertScore(client, {
        workoutId,
        athleteId: score.athleteId,
        scoreDisplay: score.scoreDisplay,
        scoreValue: score.scoreValue,
        note: score.note,
        rank: index + 1,
        isPersonalRecord
      });
    }

    return {
      workoutId,
      title: input.title,
      workoutType: input.workoutType,
      scoreCount: input.scores.length
    };
  });
}
