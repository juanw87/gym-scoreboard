TRUNCATE TABLE scores RESTART IDENTITY CASCADE;
TRUNCATE TABLE workouts RESTART IDENTITY CASCADE;
TRUNCATE TABLE athletes RESTART IDENTITY CASCADE;

INSERT INTO athletes (name, level, favorite_format) VALUES
  ('Mora', 'RX', 'For time'),
  ('Nico', 'RX', 'Weightlifting'),
  ('Lu', 'Scaled', 'AMRAP'),
  ('Tomi', 'Intermediate', 'For time'),
  ('Cande', 'RX', 'AMRAP');

INSERT INTO workouts (title, workout_date, workout_type, ranking_order, description, source_image_url) VALUES
  ('Fran', '2026-03-20', 'for_time', 'asc', '21-15-9 thrusters and pull-ups', 'https://images.example.com/fran-board.jpg'),
  ('Engine Builder', '2026-03-21', 'amrap', 'desc', '12 min AMRAP: 10 burpees, 12 box jumps, 14 wall balls', 'https://images.example.com/engine-builder.jpg'),
  ('Heavy Day', '2026-03-22', 'weight', 'desc', 'Find a heavy clean and jerk in 12 minutes', 'https://images.example.com/heavy-day.jpg');

INSERT INTO scores (workout_id, athlete_id, score_display, score_value, note, rank, is_personal_record) VALUES
  (1, 1, '14:28', 868, 'PR', 1, true),
  (1, 2, '15:01', 901, 'smooth pacing', 2, true),
  (1, 4, '16:04', 964, 'strong finish', 3, true),
  (1, 3, '16:40', 1000, 'first time RX', 4, true),
  (1, 5, '17:10', 1030, 'capped in pull-ups', 5, true),
  (2, 5, '212 reps', 212, 'won the last round', 1, true),
  (2, 3, '206 reps', 206, 'steady cadence', 2, true),
  (2, 1, '198 reps', 198, 'no misses', 3, false),
  (2, 4, '190 reps', 190, 'good control', 4, false),
  (2, 2, '184 reps', 184, 'transition work', 5, false),
  (3, 2, '112 kg', 112, 'new PR', 1, true),
  (3, 5, '98 kg', 98, 'clean technique', 2, true),
  (3, 1, '95 kg', 95, 'solid under fatigue', 3, false),
  (3, 4, '92 kg', 92, 'improved turnover', 4, true),
  (3, 3, '84 kg', 84, 'consistent', 5, true);
