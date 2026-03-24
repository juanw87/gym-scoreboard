export type AthleteSummary = {
  id: number;
  name: string;
  level: string;
  favoriteFormat: string;
};

export type AuthResponse = {
  athleteId: number;
  name: string;
  email: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type DashboardResponse = {
  featuredWorkout: {
    id: number;
    title: string;
    description: string;
    workoutDate: string;
    workoutType: string;
    workoutTypeLabel: string;
    scoreCount: number;
    topScore: string | null;
  } | null;
  leaderboard: {
    athleteId: number;
    athleteName: string;
    rank: number;
    scoreDisplay: string;
    note: string | null;
    badge: string | null;
  }[];
  recentWorkouts: {
    id: number;
    title: string;
    description: string;
    workoutDate: string;
    workoutTypeLabel: string;
    scoreCount: number;
  }[];
  stats: {
    activeAthletes: number;
    workoutCount: number;
    prCount: number;
  };
};

export type ScoreInput = {
  athleteId: string;
  scoreDisplay: string;
  scoreValue: string;
  note: string;
};

export type NewWorkoutPayload = {
  title: string;
  workoutDate: string;
  workoutType: string;
  rankingOrder: string;
  description: string;
  sourceImageUrl?: string;
  scores: {
    athleteId: number;
    scoreDisplay: string;
    scoreValue: number;
    note?: string;
  }[];
};

export type AthleteDetailResponse = {
  athlete: {
    id: number;
    name: string;
    level: string;
    favoriteFormat: string;
  };
  summary: {
    totalScores: number;
    personalRecords: number;
    latestRank: number | null;
    bestScoreDisplay: string | null;
  };
  history: {
    scoreId: number;
    workoutTitle: string;
    workoutDate: string;
    workoutTypeLabel: string;
    scoreDisplay: string;
    rank: number;
    note: string | null;
  }[];
  insights: string[];
};

export type AthleteProfileResponse = {
  athleteId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
};

export type AthleteProfileForm = {
  firstName: string;
  lastName: string;
  age: string;
  heightCm: string;
  weightKg: string;
};
