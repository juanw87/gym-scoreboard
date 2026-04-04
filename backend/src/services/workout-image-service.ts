import { HttpError } from "../errors";
import { env } from "../config";
import { CreateWorkoutInput, createWorkoutSchema } from "../validation";

const extractWorkoutSchema = {
  name: "workout_image_extraction",
  // strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["workoutDate", "blocks"],
    properties: {
      workoutDate: {
        type: ["string", "null"],
        description: "Fecha del WOD en formato YYYY-MM-DD si aparece en la imagen."
      },
      blocks: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "type", "rounds", "timeCap", "exercises"],
          properties: {
            name: {
              type: "string"
            },
            type: {
              type: ["string", "null"],
              enum: ["for_time", "amrap", "emon", "tabata"]
            },
            rounds: {
              type: ["integer", "null"],
              minimum: 1
            },
            timeCap: {
              type: ["string", "null"],
            },
            exercises: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "targetType", "reps", "timeCap", "weightMen", "weightWomen", "percentRm"],
                properties: {
                  name: {
                    type: "string"
                  },
                  targetType: {
                    type: "string",
                    enum: ["reps", "time_cap"],                    
                  },
                  reps: {
                    type: ["integer", "null"],
                    description: "Cantidad de repeticiones. Null si el ejercicio es por tiempo."
                    //minimum: 1
                  },
                  timeCap: {
                    type: ["string", "null"],
                    description: "Tiempo objetivo del ejercicio. Null si es por reps."
                  },
                  weightMen: {
                    type: ["string", "null"],
                    description: "Peso para los hombres, nulo si no aparece peso especificado en la imagen."
                  },
                  weightWomen: {
                    type: ["string", "null"],
                    description: "Peso para las mujeres, nulo si no aparece peso especificado en la imagen."
                  },
                  percentRm: {
                    type: ["string", "null"],
                    description: "Porcentaje de RM, nulo si no aparece especificado en la imagen."
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;

type ExtractedWorkoutResponse = {
  workoutDate: string | null;
  blocks: CreateWorkoutInput["blocks"];
};

function normalizeDate(rawDate: string | null) {
  if (!rawDate) {
    return new Date().toISOString().slice(0, 10);
  }

  const trimmedDate = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    return trimmedDate;
  }

  const parsedDate = new Date(trimmedDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return parsedDate.toISOString().slice(0, 10);
}

function assertSupportedImage(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i);

  if (!match) {
    throw new HttpError(400, "La imagen debe ser PNG, JPG o WEBP en formato base64.");
  }

  const base64Body = match[2].replace(/\s+/g, "");
  const approximateBytes = Math.ceil((base64Body.length * 3) / 4);

  if (approximateBytes > 8 * 1024 * 1024) {
    throw new HttpError(400, "La imagen supera el tamano maximo permitido de 8 MB.");
  }
}

function buildExtractionPrompt() {
  return [
    "Extrae un WOD desde una imagen y responde solo con JSON valido segun el schema.",
    "Debes respetar exactamente la estructura de bloques y ejercicios.",
    "Normaliza los tipos de bloque a: for_time, amrap, emon, tabata.",
    "Usa targetType='reps' cuando el ejercicio tenga repeticiones y targetType='time_cap' cuando tenga tiempo.",
    "Si el bloque es emon, todos sus ejercicios tienen un time cap por defecto de 1 minuto a menos que la imagen muestre tiempos diferentes.",
    "Si el bloque es tabata, todos sus ejercicios tienen un time cap por defecto de 20 segundos de trabajo y 10 de descanso a menos que la imagen muestre tiempos diferentes.",
    "Cuando se trabaja con Cal (calorias) el valor indica calorias para hombre y mujer, el menor valor siempre es de mujer y el mayor para hombre, debe tratarse como si fueran pesos en vez de calorias para respetar el contrato actual",
    "Si el ejercicio es Row o Bike Calorias (Cal) la cantidad de repeticiones es 1",
    "En cada bloque se deben respetar los pesos para los mismo elementos a menos que se indiquen diferencias claras en la imagen.",
    "Si el bloque es emon, la cantidad de rondas será el time_cap dividido el tiempo por ejercicio a menos que la imagen indique claramente otra cantidad de rondas.",
    "Si un bloque es de tipo emon y tiene un ejercicio que sea descanso o rest debe incluirse",
    "Si entre bloques se indica tiempo de descanso o rest, incluirlo como un bloque adicional de tipo for_time con un solo ejercicio de tiempo y targetType='time_cap' y time_cap='duracion del bloque'.",
    "Si un bloque no especifica rondas pero requiere el campo, usa 1.",
    "Si el bloque muestra EMOM, mapearlo a 'emon' para respetar el contrato actual.",
    "Si no ves fecha clara en la imagen, devuelve workoutDate=null.",
    "Si no logras identificar un bloque completo, no inventes ejercicios."
  ].join(" ");
}

function extractStructuredOutput(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== "object") {
    throw new HttpError(502, "OpenAI devolvio una respuesta invalida.");
  }

  const response = responseBody as {
    output_text?: unknown;
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const outputText =
    (typeof response.output_text === "string" ? response.output_text : null) ??
    response.output
      ?.flatMap((item) => item.content ?? [])
      .find((contentItem) => contentItem.type === "output_text" && typeof contentItem.text === "string")
      ?.text;

  if (!outputText) {
    throw new HttpError(502, "No se pudo leer la extraccion estructurada del WOD.");
  }

  return JSON.parse(outputText) as ExtractedWorkoutResponse;
}

function sanitizeNulls(obj: any): any {
  if (obj === null) return undefined;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNulls);
  }

  if (typeof obj === "object" && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeNulls(v)])
    );
  }

  return obj;
}

export async function extractWorkoutFromImage(imageDataUrl: string) {
  if (!env.OPENAI_API_KEY) {
    throw new HttpError(503, "Falta configurar OPENAI_API_KEY para procesar imagenes.");
  }

  assertSupportedImage(imageDataUrl);

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: buildExtractionPrompt()
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analiza la foto y reconstruye el payload del WOD."
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "high"
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: extractWorkoutSchema.name,
          schema: extractWorkoutSchema.schema,
          //strict: true
        }
      }
    })
  });

  console.log("OpenAI response status:", openAiResponse.status);
  // const raw = await openAiResponse.text();
  // console.log(raw);

  if (!openAiResponse.ok) {
    const errorText = await openAiResponse.text();
    throw new HttpError(502, `OpenAI no pudo procesar la imagen. ${errorText}`);
  }

  const extractedWorkout = extractStructuredOutput(await openAiResponse.json());
  const workoutDate = normalizeDate(extractedWorkout.workoutDate);
  const normalizedPayload = createWorkoutSchema.parse({
    workoutDate,
    blocks: sanitizeNulls(extractedWorkout.blocks),
    scores: []
  });

  return {
    workoutDate: normalizedPayload.workoutDate,
    blocks: normalizedPayload.blocks,
    usedFallbackDate: extractedWorkout.workoutDate === null
  };
}
