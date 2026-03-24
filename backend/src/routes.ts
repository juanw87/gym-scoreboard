import { Router } from "express";
import { loginController, registerController } from "./controllers/auth-controller";
import {
  getAthleteDetailController,
  getAthletesController,
  getDashboardController
} from "./controllers/dashboard-controller";
import { getHealth } from "./controllers/health-controller";
import { createWorkoutController } from "./controllers/workout-controller";

export const router = Router();

router.get("/health", getHealth);
router.post("/auth/login", loginController);
router.post("/auth/register", registerController);
router.get("/dashboard", getDashboardController);
router.get("/athletes", getAthletesController);
router.get("/athletes/:id", getAthleteDetailController);
router.post("/workouts", createWorkoutController);
