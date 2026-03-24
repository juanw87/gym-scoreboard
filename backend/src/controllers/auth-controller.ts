import { NextFunction, Request, Response } from "express";
import { loginAthlete, registerAthlete } from "../services/auth-service";
import { loginSchema, registerSchema } from "../validation";

export async function loginController(request: Request, response: Response, next: NextFunction) {
  try {
    const payload = loginSchema.parse(request.body);
    const athlete = await loginAthlete(payload);

    response.json(athlete);
  } catch (error) {
    next(error);
  }
}

export async function registerController(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const payload = registerSchema.parse(request.body);
    const athlete = await registerAthlete(payload);

    response.status(201).json(athlete);
  } catch (error) {
    next(error);
  }
}
