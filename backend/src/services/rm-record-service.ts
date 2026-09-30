import { withTransaction } from "../db";
import { findRmRecordsByAthlete, upsertRmRecord } from "../repositories/rm-record-repository";
import { CreateRmRecordInput } from "../validation";

function mapRmRecord(row: {
  id: number;
  athlete_id: number;
  exercise_name: string;
  rm_value: string;
  rm_date: string;
  created_at: string;
}) {
  return {
    id: row.id,
    athleteId: row.athlete_id,
    exerciseName: row.exercise_name,
    rmValue: Number(row.rm_value),
    rmDate: row.rm_date,
    createdAt: row.created_at
  };
}

export async function createRmRecord(athleteId: number, input: CreateRmRecordInput) {
  const record = await withTransaction(async (client) =>
    upsertRmRecord(client, {
      athleteId,
      exerciseName: input.exerciseName,
      rmValue: input.rmValue,
      rmDate: input.rmDate
    })
  );

  return mapRmRecord(record);
}

export async function getRmRecordsByAthlete(athleteId: number) {
  const rows = await findRmRecordsByAthlete(athleteId);
  const mapped = rows.map(mapRmRecord);

  const groups = new Map<
    string,
    { exerciseName: string; latest: (typeof mapped)[number]; history: (typeof mapped)[number][] }
  >();

  for (const record of mapped) {
    const existing = groups.get(record.exerciseName);

    if (!existing) {
      groups.set(record.exerciseName, {
        exerciseName: record.exerciseName,
        latest: record,
        history: [record]
      });
    } else {
      existing.history.push(record);
    }
  }

  return [...groups.values()].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}
