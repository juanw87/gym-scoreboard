import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { labelWorkoutType } from "../helpers";
import {
  getAthleteDetail,
  getAthletes,
  getDashboard
} from "../services/dashboard-service";

export async function getDashboardController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const dashboard = await getDashboard();

    response.json({
      featuredWorkout: dashboard.featuredWorkout
        ? {
            ...dashboard.featuredWorkout,
            workoutTypeLabel: labelWorkoutType(dashboard.featuredWorkout.workoutType)
          }
        : null,
      leaderboard: dashboard.leaderboard,
      recentWorkouts: dashboard.recentWorkouts.map((workout) => ({
        ...workout,
        workoutTypeLabel: labelWorkoutType(workout.workoutType)
      })),
      stats: dashboard.stats
    });
  } catch (error) {
    next(error);
  }
}

export async function getAthletesController(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    response.json(await getAthletes());
  } catch (error) {
    next(error);
  }
}

export async function getAthleteDetailController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = z.coerce.number().int().positive().parse(request.params.id);
    const athlete = await getAthleteDetail(athleteId);

    if (!athlete) {
      response.status(404).json({ error: "Atleta no encontrado." });
      return;
    }

    response.json({
      athlete: athlete.athlete,
      summary: athlete.summary,
      history: athlete.history.map((entry) => ({
        ...entry,
        workoutTypeLabel: labelWorkoutType(entry.workoutType)
      })),
      insights: athlete.insights
    });
  } catch (error) {
    next(error);
  }
}
