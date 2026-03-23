import { NextFunction, Request, Response } from "express";
import { labelWorkoutType } from "../helpers";
import { createWorkout } from "../services/workout-service";
import { createWorkoutSchema } from "../validation";

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
