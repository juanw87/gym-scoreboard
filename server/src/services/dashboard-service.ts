import { query } from "../db";
import { buildAthleteInsights, labelWorkoutType } from "../helpers";

export async function getDashboard() {
  const featuredWorkoutResult = await query<{
    workout_id: number;
    title: string;
    description: string;
    workout_date: string;
    workout_type: string;
    score_count: string;
    top_score: string | null;
  }>(
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

  const leaderboardResult = await query<{
    athlete_id: number;
    athlete_name: string;
    rank: number;
    score_display: string;
    note: string | null;
    badge: string | null;
  }>(
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

  const recentWorkoutsResult = await query<{
    id: number;
    title: string;
    description: string;
    workout_date: string;
    workout_type: string;
    score_count: string;
  }>(
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
      LIMIT 6
    `
  );

  const statsResult = await query<{
    active_athletes: string;
    workout_count: string;
    pr_count: string;
  }>(
    `
      SELECT
        (SELECT COUNT(DISTINCT athlete_id) FROM scores)::text AS active_athletes,
        (SELECT COUNT(*) FROM workouts)::text AS workout_count,
        (SELECT COUNT(*) FROM scores WHERE is_personal_record = true)::text AS pr_count
    `
  );

  const featuredWorkout = featuredWorkoutResult.rows[0];
  const stats = statsResult.rows[0];

  return {
    featuredWorkout: featuredWorkout
      ? {
          id: featuredWorkout.workout_id,
          title: featuredWorkout.title,
          description: featuredWorkout.description,
          workoutDate: featuredWorkout.workout_date,
          workoutType: featuredWorkout.workout_type,
          workoutTypeLabel: labelWorkoutType(featuredWorkout.workout_type),
          scoreCount: Number(featuredWorkout.score_count),
          topScore: featuredWorkout.top_score
        }
      : null,
    leaderboard: leaderboardResult.rows.map((entry) => ({
      athleteId: entry.athlete_id,
      athleteName: entry.athlete_name,
      rank: entry.rank,
      scoreDisplay: entry.score_display,
      note: entry.note,
      badge: entry.badge
    })),
    recentWorkouts: recentWorkoutsResult.rows.map((workout) => ({
      id: workout.id,
      title: workout.title,
      description: workout.description,
      workoutDate: workout.workout_date,
      workoutTypeLabel: labelWorkoutType(workout.workout_type),
      scoreCount: Number(workout.score_count)
    })),
    stats: {
      activeAthletes: Number(stats?.active_athletes ?? 0),
      workoutCount: Number(stats?.workout_count ?? 0),
      prCount: Number(stats?.pr_count ?? 0)
    }
  };
}

export async function getAthletes() {
  const result = await query<{
    id: number;
    name: string;
    level: string;
    favorite_format: string;
  }>(
    `
      SELECT id, name, level, favorite_format
      FROM athletes
      ORDER BY name ASC
    `
  );

  return result.rows.map((athlete) => ({
    id: athlete.id,
    name: athlete.name,
    level: athlete.level,
    favoriteFormat: athlete.favorite_format
  }));
}

export async function getAthleteDetail(athleteId: number) {
  const athleteResult = await query<{
    id: number;
    name: string;
    level: string;
    favorite_format: string;
  }>(
    `
      SELECT id, name, level, favorite_format
      FROM athletes
      WHERE id = $1
    `,
    [athleteId]
  );

  const athlete = athleteResult.rows[0];

  if (!athlete) {
    return null;
  }

  const historyResult = await query<{
    score_id: number;
    title: string;
    workout_date: string;
    workout_type: string;
    score_display: string;
    rank: number;
    note: string | null;
    is_personal_record: boolean;
  }>(
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

  const latestRank = historyResult.rows[0]?.rank ?? null;
  const personalRecords = historyResult.rows.filter((entry) => entry.is_personal_record).length;
  const recentAverageRank =
    historyResult.rows.length > 0
      ? historyResult.rows.slice(0, 5).reduce((sum, entry) => sum + entry.rank, 0) /
        Math.min(historyResult.rows.length, 5)
      : null;

  return {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      level: athlete.level,
      favoriteFormat: athlete.favorite_format
    },
    summary: {
      totalScores: historyResult.rows.length,
      personalRecords,
      latestRank,
      bestScoreDisplay:
        historyResult.rows.find((entry) => entry.is_personal_record)?.score_display ??
        historyResult.rows[0]?.score_display ??
        null
    },
    history: historyResult.rows.map((entry) => ({
      scoreId: entry.score_id,
      workoutTitle: entry.title,
      workoutDate: entry.workout_date,
      workoutTypeLabel: labelWorkoutType(entry.workout_type),
      scoreDisplay: entry.score_display,
      rank: entry.rank,
      note: entry.note
    })),
    insights: buildAthleteInsights({
      athleteName: athlete.name,
      totalScores: historyResult.rows.length,
      personalRecords,
      latestRank,
      favoriteFormat: athlete.favorite_format,
      recentAverageRank
    })
  };
}
