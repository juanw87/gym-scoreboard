export function labelWorkoutType(workoutType: string) {
  switch (workoutType) {
    case "for_time":
      return "For time";
    case "amrap":
      return "AMRAP";
    case "emon":
      return "EMON";
    case "tabata":
      return "Tabata";
    case "weight":
      return "Weightlifting";
    default:
      return workoutType;
  }
}

export function buildAthleteInsights(input: {
  athleteName: string;
  totalScores: number;
  personalRecords: number;
  latestRank: number | null;
  favoriteFormat: string;
  recentAverageRank: number | null;
}) {
  const insights: string[] = [];

  if (input.personalRecords > 1) {
    insights.push(
      `${input.athleteName} ya sumo ${input.personalRecords} PRs en el historial cargado.`
    );
  } else {
    insights.push(`${input.athleteName} todavia tiene bastante margen para capturar nuevos PRs.`);
  }

  if (input.latestRank && input.latestRank <= 3) {
    insights.push("Se mantiene peleando el podio en los WODs mas recientes.");
  } else if (input.latestRank) {
    insights.push("Todavia hay espacio para subir en el ranking diario del box.");
  }

  if (input.recentAverageRank) {
    insights.push(
      `Su promedio reciente ronda el puesto ${input.recentAverageRank.toFixed(1)} en el box.`
    );
  }

  insights.push(`El formato donde mas se siente comodo es ${input.favoriteFormat}.`);
  insights.push(`Tiene ${input.totalScores} scores persistidos para medir progreso real.`);

  return insights.slice(0, 4);
}
