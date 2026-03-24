import { hashPassword, verifyPassword } from "../auth";
import { HttpError } from "../errors";
import {
  findAthleteAccountByEmail,
  insertAthleteAccount
} from "../repositories/auth-repository";
import { LoginInput, RegisterInput } from "../validation";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function buildFullName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export async function loginAthlete(input: LoginInput) {
  const email = normalizeEmail(input.email);
  const athlete = await findAthleteAccountByEmail(email);

  if (!athlete?.password_hash) {
    throw new HttpError(401, "Nombre de usuario o contraseña incorrecta");
  }

  const isPasswordValid = await verifyPassword(input.password, athlete.password_hash);

  if (!isPasswordValid) {
    throw new HttpError(401, "Nombre de usuario o contraseña incorrecta");
  }

  return {
    athleteId: athlete.id,
    name: athlete.name,
    email: athlete.email ?? email
  };
}

export async function registerAthlete(input: RegisterInput) {
  const email = normalizeEmail(input.email);
  const existingAthlete = await findAthleteAccountByEmail(email);

  if (existingAthlete) {
    throw new HttpError(409, "Ya existe un usuario registrado con ese correo electrónico.");
  }

  const passwordHash = await hashPassword(input.password);
  const athlete = await insertAthleteAccount({
    name: buildFullName(input.firstName, input.lastName),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    passwordHash
  });

  return {
    athleteId: athlete.id,
    name: athlete.name,
    email: athlete.email ?? email
  };
}
