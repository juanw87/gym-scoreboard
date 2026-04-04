import { NextFunction, Request, Response } from "express";
import { extractWorkoutFromImage } from "../services/workout-image-service";
import { extractWorkoutImageSchema } from "../validation";

export async function extractWorkoutImageController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const payload = extractWorkoutImageSchema.parse(request.body);
    const extractedWorkout = await extractWorkoutFromImage(payload.imageDataUrl);

    response.status(200).json(extractedWorkout);
  } catch (error) {
    next(error);
  }
}
