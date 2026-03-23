import { buildAthleteInsights } from "../helpers";
import {
  findAthleteById,
  findAthleteHistory,
  findAthletes,
  findDashboardStats,
  findFeaturedWorkout,
  findLatestLeaderboard,
  findRecentWorkouts
} from "../repositories/dashboard-repository";

export async function getDashboard() {
  const [featuredWorkout, leaderboard, recentWorkouts, stats] = await Promise.all([
    findFeaturedWorkout(),
    findLatestLeaderboard(),
    findRecentWorkouts(),
    findDashboardStats()
  ]);

  return {
    featuredWorkout: featuredWorkout
      ? {
          id: featuredWorkout.workout_id,
          title: featuredWorkout.title,
          description: featuredWorkout.description,
          workoutDate: featuredWorkout.workout_date,
          workoutType: featuredWorkout.workout_type,
          scoreCount: Number(featuredWorkout.score_count),
          topScore: featuredWorkout.top_score
        }
      : null,
    leaderboard: leaderboard.map((entry) => ({
      athleteId: entry.athlete_id,
      athleteName: entry.athlete_name,
      rank: entry.rank,
      scoreDisplay: entry.score_display,
      note: entry.note,
      badge: entry.badge
    })),
    recentWorkouts: recentWorkouts.map((workout) => ({
      id: workout.id,
      title: workout.title,
      description: workout.description,
      workoutDate: workout.workout_date,
      workoutType: workout.workout_type,
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
  const athletes = await findAthletes();

  return athletes.map((athlete) => ({
    id: athlete.id,
    name: athlete.name,
    level: athlete.level,
    favoriteFormat: athlete.favorite_format
  }));
}

export async function getAthleteDetail(athleteId: number) {
  const athlete = await findAthleteById(athleteId);

  if (!athlete) {
    return null;
  }

  const history = await findAthleteHistory(athleteId);
  const latestRank = history[0]?.rank ?? null;
  const personalRecords = history.filter((entry) => entry.is_personal_record).length;
  const recentAverageRank =
    history.length > 0
      ? history.slice(0, 5).reduce((sum, entry) => sum + entry.rank, 0) / Math.min(history.length, 5)
      : null;

  return {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      level: athlete.level,
      favoriteFormat: athlete.favorite_format
    },
    summary: {
      totalScores: history.length,
      personalRecords,
      latestRank,
      bestScoreDisplay:
        history.find((entry) => entry.is_personal_record)?.score_display ??
        history[0]?.score_display ??
        null
    },
    history: history.map((entry) => ({
      scoreId: entry.score_id,
      workoutTitle: entry.title,
      workoutDate: entry.workout_date,
      workoutType: entry.workout_type,
      scoreDisplay: entry.score_display,
      rank: entry.rank,
      note: entry.note
    })),
    insights: buildAthleteInsights({
      athleteName: athlete.name,
      totalScores: history.length,
      personalRecords,
      latestRank,
      favoriteFormat: athlete.favorite_format,
      recentAverageRank
    })
  };
}
