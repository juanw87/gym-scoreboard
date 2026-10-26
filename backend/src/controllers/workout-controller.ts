import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { labelWorkoutType } from "../helpers";
import { getAuthenticatedAthleteId } from "../request-auth";
import {
  createWorkout,
  getSubscribedWorkouts,
  listWorkouts,
  submitWorkoutScore,
  subscribeToWorkout,
  unsubscribeFromWorkout
} from "../services/workout-service";
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

export async function getSubscribedWorkoutsController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = getAuthenticatedAthleteId(request);
    const workouts = await getSubscribedWorkouts(athleteId);

    response.json({
      subscribedWorkouts: workouts.map((workout) => ({
        ...workout,
        workoutTypeLabel: labelWorkoutType(workout.workoutType)
      }))
    });
  } catch (error) {
    next(error);
  }
}

export async function subscribeToWorkoutController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = getAuthenticatedAthleteId(request);
    const workoutId = z.coerce.number().int().positive().parse(request.params.workoutId);
    const workout = await subscribeToWorkout(athleteId, workoutId);

    response.status(201).json({
      workoutId: workout.workoutId,
      title: workout.title,
      workoutTypeLabel: labelWorkoutType(workout.workoutType)
    });
  } catch (error) {
    next(error);
  }
}

export async function unsubscribeFromWorkoutController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = getAuthenticatedAthleteId(request);
    const workoutId = z.coerce.number().int().positive().parse(request.params.workoutId);
    await unsubscribeFromWorkout(athleteId, workoutId);

    response.json({ workoutId });
  } catch (error) {
    next(error);
  }
}

export async function listWorkoutsController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const workouts = await listWorkouts();

    response.json({
      workouts: workouts.map((workout) => ({
        ...workout,
        workoutTypeLabel: labelWorkoutType(workout.workoutType)
      }))
    });
  } catch (error) {
    next(error);
  }
}
