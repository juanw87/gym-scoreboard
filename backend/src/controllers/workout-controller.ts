import { NextFunction, Request, Response } from "express";
import { labelWorkoutType } from "../helpers";
import { getAuthenticatedAthleteId } from "../request-auth";
import { createWorkout, submitWorkoutScore } from "../services/workout-service";
import { createWorkoutSchema, submitWorkoutScoreSchema } from "../validation";

export async function createWorkoutController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const payload = createWorkoutSchema.parse(request.body);
    const workout = await createWorkout(payload);

    response.status(201).json({
      workoutId: workout.workoutId,
      title: workout.title,
      workoutTypeLabel: labelWorkoutType(workout.workoutType),
      scoreCount: workout.scoreCount
    });
  } catch (error) {
    next(error);
  }
}

export async function submitWorkoutScoreController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = getAuthenticatedAthleteId(request);
    const workoutId = Number(request.params.workoutId);
    const payload = submitWorkoutScoreSchema.parse(request.body);
    const score = await submitWorkoutScore(athleteId, workoutId, payload);

    response.status(201).json({
      workoutId: score.workoutId,
      title: score.title,
      workoutTypeLabel: labelWorkoutType(score.workoutType),
      scoreCount: score.scoreCount,
      action: score.action
    });
  } catch (error) {
    next(error);
  }
}
