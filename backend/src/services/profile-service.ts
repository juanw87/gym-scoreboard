import { HttpError } from "../errors";
import {
  findAthleteProfileById,
  updateAthleteProfile
} from "../repositories/profile-repository";
import { AthleteProfileInput } from "../validation";

function splitStoredName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);

  return {
    firstName: firstName ?? "",
    lastName: rest.join(" ")
  };
}

function mapProfile(record: NonNullable<Awaited<ReturnType<typeof findAthleteProfileById>>>) {
  const fallbackName = splitStoredName(record.name);

  return {
    athleteId: record.id,
    firstName: record.first_name ?? fallbackName.firstName,
    lastName: record.last_name ?? fallbackName.lastName,
    email: record.email,
    age: record.age,
    heightCm: record.height_cm === null ? null : Number(record.height_cm),
    weightKg: record.weight_kg === null ? null : Number(record.weight_kg)
  };
}

export async function getAthleteProfile(athleteId: number) {
  const athlete = await findAthleteProfileById(athleteId);

  if (!athlete) {
    throw new HttpError(404, "Perfil de atleta no encontrado.");
  }

  return mapProfile(athlete);
}

export async function saveAthleteProfile(athleteId: number, input: AthleteProfileInput) {
  const athlete = await updateAthleteProfile({
    athleteId,
    firstName: input.firstName,
    lastName: input.lastName,
    age: input.age,
    heightCm: input.heightCm,
    weightKg: input.weightKg
  });

  if (!athlete) {
    throw new HttpError(404, "Perfil de atleta no encontrado.");
  }

  return mapProfile(athlete);
}
