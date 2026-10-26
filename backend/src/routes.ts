import { Router } from "express";
import { loginController, registerController } from "./controllers/auth-controller";
import {
  getAthleteDetailController,
  getAthletesController,
  getDashboardController
} from "./controllers/dashboard-controller";
import { getHealth } from "./controllers/health-controller";
import { getProfileController, updateProfileController } from "./controllers/profile-controller";
import { createRmRecordController, getRmRecordsController } from "./controllers/rm-record-controller";
import { extractWorkoutImageController } from "./controllers/workout-image-controller";
import {
  createWorkoutController,
  getSubscribedWorkoutsController,
  listWorkoutsController,
  submitWorkoutScoreController,
  subscribeToWorkoutController,
  unsubscribeFromWorkoutController
} from "./controllers/workout-controller";

export const router = Router();

router.get("/health", getHealth);
router.post("/auth/login", loginController);
router.post("/auth/register", registerController);
router.get("/dashboard", getDashboardController);
router.get("/profile/:athleteId", getProfileController);
router.put("/profile/:athleteId", updateProfileController);
router.post("/rms", createRmRecordController);
router.get("/rms/:athleteId", getRmRecordsController);
router.get("/athletes", getAthletesController);
router.get("/athletes/:id", getAthleteDetailController);
router.post("/workouts", createWorkoutController);
router.post("/workouts/extract-image", extractWorkoutImageController);
router.get("/workouts", listWorkoutsController);
router.get("/workouts/subscribed", getSubscribedWorkoutsController);
router.post("/workouts/:workoutId/subscribe", subscribeToWorkoutController);
router.delete("/workouts/:workoutId/subscribe", unsubscribeFromWorkoutController);
router.post("/workouts/:workoutId/scores", submitWorkoutScoreController);
