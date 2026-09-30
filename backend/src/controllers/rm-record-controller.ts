import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { assertOwnAthleteAccess, getAuthenticatedAthleteId } from "../request-auth";
import { createRmRecord, getRmRecordsByAthlete } from "../services/rm-record-service";
import { createRmRecordSchema } from "../validation";

export async function createRmRecordController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = getAuthenticatedAthleteId(request);
    const payload = createRmRecordSchema.parse(request.body);
    const record = await createRmRecord(athleteId, payload);

    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
}

export async function getRmRecordsController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const athleteId = z.coerce.number().int().positive().parse(request.params.athleteId);
    assertOwnAthleteAccess(request, athleteId);

    response.json(await getRmRecordsByAthlete(athleteId));
  } catch (error) {
    next(error);
  }
}
