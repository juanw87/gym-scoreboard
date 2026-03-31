CREATE TABLE IF NOT EXISTS athletes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'Atleta',
  favorite_format TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,2);

ALTER TABLE athletes
  ALTER COLUMN level SET DEFAULT 'Atleta';

ALTER TABLE athletes
  ALTER COLUMN favorite_format SET DEFAULT 'General';

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  workout_date DATE NOT NULL,
  workout_type TEXT NOT NULL CHECK (workout_type IN ('for_time', 'amrap', 'weight', 'emon', 'tabata')),
  ranking_order TEXT NOT NULL CHECK (ranking_order IN ('asc', 'desc')),
  description TEXT NOT NULL,
  source_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'workouts_workout_type_check'
  ) THEN
    ALTER TABLE workouts DROP CONSTRAINT workouts_workout_type_check;
  END IF;
END $$;

ALTER TABLE workouts
  ADD CONSTRAINT workouts_workout_type_check
  CHECK (workout_type IN ('for_time', 'amrap', 'weight', 'emon', 'tabata'));

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  score_display TEXT NOT NULL,
  score_value NUMERIC NOT NULL,
  note TEXT,
  rank INTEGER NOT NULL,
  is_personal_record BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_workout_id ON scores(workout_id);
CREATE INDEX IF NOT EXISTS idx_scores_athlete_id ON scores(athlete_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_athletes_email_unique
  ON athletes ((LOWER(email)))
  WHERE email IS NOT NULL;
