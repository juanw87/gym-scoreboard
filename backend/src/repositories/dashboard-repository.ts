import { query } from "../db";

export type FeaturedWorkoutRecord = {
  workout_id: number;
  title: string;
  description: string;
  workout_date: string;
  workout_type: string;
  score_count: string;
  top_score: string | null;
};

export type LeaderboardEntryRecord = {
  athlete_id: number;
  athlete_name: string;
  rank: number;
  score_display: string;
  note: string | null;
  badge: string | null;
};

export type RecentWorkoutRecord = {
  id: number;
  title: string;
  description: string;
  workout_date: string;
  workout_type: string;
  score_count: string;
};

export type DashboardStatsRecord = {
  active_athletes: string;
  workout_count: string;
  pr_count: string;
};

export type AthleteRecord = {
  id: number;
  name: string;
  level: string;
  favorite_format: string;
};

export type AthleteHistoryRecord = {
  score_id: number;
  title: string;
  workout_date: string;
  workout_type: string;
  score_display: string;
  rank: number;
  note: string | null;
  is_personal_record: boolean;
};

export async function findFeaturedWorkout() {
  const result = await query<FeaturedWorkoutRecord>(
    `
      SELECT
        w.id AS workout_id,
        w.title,
        w.description,
        TO_CHAR(w.workout_date, 'YYYY-MM-DD') AS workout_date,
        w.workout_type,
        COUNT(s.id)::text AS score_count,
        (
          SELECT score_display
          FROM scores inner_scores
          WHERE inner_scores.workout_id = w.id
          ORDER BY inner_scores.rank ASC
          LIMIT 1
        ) AS top_score
      FROM workouts w
      LEFT JOIN scores s ON s.workout_id = w.id
      GROUP BY w.id
      ORDER BY w.workout_date DESC, w.id DESC
      LIMIT 1
    `
  );

  return result.rows[0] ?? null;
}

export async function findLatestLeaderboard() {
  const result = await query<LeaderboardEntryRecord>(
    `
      SELECT
        s.athlete_id,
        a.name AS athlete_name,
        s.rank,
        s.score_display,
        s.note,
        CASE
          WHEN s.is_personal_record THEN 'PR'
          WHEN s.rank <= 3 THEN 'Top 3'
          ELSE NULL
        END AS badge
      FROM scores s
      INNER JOIN athletes a ON a.id = s.athlete_id
      WHERE s.workout_id = (
        SELECT id
        FROM workouts
        ORDER BY workout_date DESC, id DESC
        LIMIT 1
      )
      ORDER BY s.rank ASC
    `
  );

  return result.rows;
}

export async function findRecentWorkouts(limit = 6) {
  const result = await query<RecentWorkoutRecord>(
    `
      SELECT
        w.id,
        w.title,
        w.description,
        TO_CHAR(w.workout_date, 'YYYY-MM-DD') AS workout_date,
        w.workout_type,
        COUNT(s.id)::text AS score_count
      FROM workouts w
      LEFT JOIN scores s ON s.workout_id = w.id
      GROUP BY w.id
      ORDER BY w.workout_date DESC, w.id DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
}

export async function findDashboardStats() {
  const result = await query<DashboardStatsRecord>(
    `
      SELECT
        (SELECT COUNT(DISTINCT athlete_id) FROM scores)::text AS active_athletes,
        (SELECT COUNT(*) FROM workouts)::text AS workout_count,
        (SELECT COUNT(*) FROM scores WHERE is_personal_record = true)::text AS pr_count
    `
  );

  return result.rows[0] ?? null;
}

export async function findAthletes() {
  const result = await query<AthleteRecord>(
    `
      SELECT id, name, level, favorite_format
      FROM athletes
      ORDER BY name ASC
    `
  );

  return result.rows;
}

export async function findAthleteById(athleteId: number) {
  const result = await query<AthleteRecord>(
    `
      SELECT id, name, level, favorite_format
      FROM athletes
      WHERE id = $1
    `,
    [athleteId]
  );

  return result.rows[0] ?? null;
}

export async function findAthleteHistory(athleteId: number) {
  const result = await query<AthleteHistoryRecord>(
    `
      SELECT
        s.id AS score_id,
        w.title,
        TO_CHAR(w.workout_date, 'YYYY-MM-DD') AS workout_date,
        w.workout_type,
        s.score_display,
        s.rank,
        s.note,
        s.is_personal_record
      FROM scores s
      INNER JOIN workouts w ON w.id = s.workout_id
      WHERE s.athlete_id = $1
      ORDER BY w.workout_date DESC, s.id DESC
    `,
    [athleteId]
  );

  return result.rows;
}
