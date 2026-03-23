import { Router } from "express";
import { z } from "zod";
import { getAthleteDetail, getAthletes, getDashboard } from "./services/dashboard-service";
import { createWorkout } from "./services/workout-service";
import { createWorkoutSchema } from "./validation";

export const router = Router();

router.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

router.get("/dashboard", async (_request, response, next) => {
  try {
    response.json(await getDashboard());
  } catch (error) {
    next(error);
  }
});

router.get("/athletes", async (_request, response, next) => {
  try {
    response.json(await getAthletes());
  } catch (error) {
    next(error);
  }
});

router.get("/athletes/:id", async (request, response, next) => {
  try {
    const athleteId = z.coerce.number().int().positive().parse(request.params.id);
    const athlete = await getAthleteDetail(athleteId);

    if (!athlete) {
      response.status(404).json({ error: "Atleta no encontrado." });
      return;
    }

    response.json(athlete);
  } catch (error) {
    next(error);
  }
});

router.post("/workouts", async (request, response, next) => {
  try {
    const payload = createWorkoutSchema.parse(request.body);
    const workout = await createWorkout(payload);
    response.status(201).json(workout);
  } catch (error) {
    next(error);
  }
});
