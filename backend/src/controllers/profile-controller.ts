import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { assertOwnAthleteAccess } from "../request-auth";
import { getAthleteProfile, saveAthleteProfile } from "../services/profile-service";
import { athleteProfileSchema } from "../validation";

export async function getProfileController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = z.coerce.number().int().positive().parse(request.params.athleteId);
    assertOwnAthleteAccess(request, athleteId);

    response.json(await getAthleteProfile(athleteId));
  } catch (error) {
    next(error);
  }
}

export async function updateProfileController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = z.coerce.number().int().positive().parse(request.params.athleteId);
    assertOwnAthleteAccess(request, athleteId);
    const payload = athleteProfileSchema.parse(request.body);

    response.json(await saveAthleteProfile(athleteId, payload));
  } catch (error) {
    next(error);
  }
}
