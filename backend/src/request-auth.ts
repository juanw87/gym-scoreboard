import { Request } from "express";
import { HttpError } from "./errors";

export function getAuthenticatedAthleteId(request: Request) {
  const athleteIdHeader = request.header("x-athlete-id");
  const athleteId = Number(athleteIdHeader);

  if (!athleteIdHeader || Number.isNaN(athleteId) || athleteId <= 0) {
    throw new HttpError(401, "Debes iniciar sesión para acceder a esta información.");
  }

  return athleteId;
}

export function assertOwnAthleteAccess(request: Request, requestedAthleteId: number) {
  const authenticatedAthleteId = getAuthenticatedAthleteId(request);

  if (authenticatedAthleteId !== requestedAthleteId) {
    throw new HttpError(403, "No puedes acceder al perfil de otro atleta.");
  }

  return authenticatedAthleteId;
}
