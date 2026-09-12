import { env } from "../config";
import { HttpError } from "../errors";
import type { BlockInput } from "../validators/workout.validator";

const exerciseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "category", "reps", "load", "distance", "calories", "bodyweight"],
  properties: {
    name: { type: "string" },
    category: {
      type: "string",
      enum: ["load", "bodyweight", "distance", "calories"]
    },
    reps: { type: ["integer", "null"], minimum: 1 },
    load: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["male", "female", "unit"],
          properties: {
            male: { type: "number", exclusiveMinimum: 0 },
            female: { type: "number", exclusiveMinimum: 0 },
            unit: { type: "string", enum: ["kg", "lb"] }
          }
        },
        { type: "null" }
      ]
    },
    distance: {
      anyOf: [
         {
          type: "object",
          additionalProperties: false,
          required: ["distance", "distance_unit"],
          properties: {
            distance: { type: ["number", "null"], exclusiveMinimum: 0 },
            distance_unit: { type: ["string", "null"], enum: ["meters", "km"] }            
          }
        },
        { type: "null" }
      ]
    },
    calories: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["male", "female"],
          properties: {
            male: { type: "number", exclusiveMinimum: 0 },
            female: { type: "number", exclusiveMinimum: 0 }
          }
        },
        { type: "null" }
      ]
    },
    bodyweight: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["reps"],
          properties: {
            reps: { type: "number", exclusiveMinimum: 0 }
          }
        },
        {
          type: "object",
          additionalProperties: false,
          required: ["time"],
          properties: {
            time: { type: "number", exclusiveMinimum: 0 }
          }
        },
        { type: "null" }
      ]
    }
  }
} as const;

const wodFormatSchema = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["wod_type", "duration", "variant", "progression"],
      properties: {
        wod_type: { type: "string", const: "amrap" },
        duration: { type: "number", exclusiveMinimum: 0 },
        variant: { type: "string", enum: ["classic", "increasing"] },
        progression: {
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["increment"],
              properties: {
                increment: { type: "number", exclusiveMinimum: 0 }
              }
            },
            { type: "null" }
          ]
        }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["wod_type", "interval_minutes", "total_minutes", "mode"],
      properties: {
        wod_type: { type: "string", const: "emom" },
        interval_minutes: { type: "number", exclusiveMinimum: 0 },
        total_minutes: { type: "number", exclusiveMinimum: 0 },
        mode: { type: "string", enum: ["fixed_reps", "max_reps"] }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["wod_type", "rounds", "time_cap_seconds"],
      properties: {
        wod_type: { type: "string", const: "rft" },
        rounds: { type: "integer", minimum: 1 },
        time_cap_seconds: { type: ["number", "null"], exclusiveMinimum: 0 }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["wod_type", "work_seconds", "rest_seconds", "rounds"],
      properties: {
        wod_type: { type: "string", const: "tabata" },
        work_seconds: { type: "integer", minimum: 20 },
        rest_seconds: { type: "integer", minimum: 10 },
        rounds: { type: "integer", const: 8 }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["wod_type", "type", "start_reps", "step", "max_reps"],
      properties: {
        wod_type: { type: "string", const: "ladder" },
        type: { type: "string", enum: ["ascending", "descending", "pyramid"] },
        start_reps: { type: "integer", minimum: 1 },
        step: { type: "integer", minimum: 1 },
        max_reps: { type: ["integer", "null"], minimum: 1 }
      }
    }
  ]
} as const;

const wodBlockSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "title", "structure"],
  properties: {
    type: {
      type: "string",
      const: "wod"
    },
    title: {
      type: "string",
      default: "WOD"
    },
    structure: {
      type: "object",
      additionalProperties: false,
      required: ["format", "exercises"],
      properties: {
        format: wodFormatSchema,
        exercises: {
          type: "array",
          minItems: 1,
          items: exerciseSchema
        }
      }
    }
  }
} as const;

const strengthBlockSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "title", "structure"],
  properties: {
    type: {
      type: "string",
      enum: ["strength", "weightlifting", "gymnastic"]
    },
    title: {
      type: "string"
    },
    structure: {
      type: "object",
      additionalProperties: false,
      required: ["sets", "reps", "load", "rest_seconds"],
      properties: {
        sets: { type: "integer", minimum: 1 },
        reps: { type: "integer", minimum: 1 },
        load: {
          anyOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["type", "value", "unit"],
              properties: {
                type: { type: "string", enum: ["percentage", "fixed", "rpe"] },
                value: { type: "number", exclusiveMinimum: 0 },
                unit: { type: ["string", "null"] }
              }
            },
            { type: "null" }
          ]
        },
        rest_seconds: { type: ["number", "null"], exclusiveMinimum: 0 }
      }
    }
  }
} as const;

const extractWorkoutSchema = {
  name: "workout_image_extraction",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["class"],
    properties: {
      class: {
        type: "object",
        additionalProperties: false,
        required: ["date", "name", "blocks"],
        properties: {
          date: {
            type: ["string", "null"]
          },
          name: {
            type: "string"
          },
          blocks: {
            type: "array",
            minItems: 1,
            items: {
              anyOf: [wodBlockSchema, strengthBlockSchema]
            }
          }
        }
      }
    }
  }
} as const;

type ExtractedWorkoutResponse = {
  class: {
    date: string | null;
    name: string;
    blocks: BlockInput[];
  };
};

function buildParsingPrompt() {
  return [
    "Eres un parser experto de clases de CrossFit.",
    "Analiza la imagen del workout y conviertela en JSON valido usando el schema estructurado definido.",
    "Usa bloques de tipo wod, strength, weightlifting o gymnastic.",
    "Para bloques wod usa structure.format con wod_type amrap, emom, rft, tabata o ladder.",
    "Para ejercicios usa category load, bodyweight, distance o calories.",
    "Incluye solo campos soportados por el schema.",
    "Si falta la fecha, devuelve null.",
    "Si no puedes inferir un dato con seguridad razonable, omite el campo opcional en vez de inventarlo.",
    "Responde solo con JSON."
  ].join(" ");
}

function extractStructuredOutput(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== "object") {
    throw new HttpError(502, "OpenAI devolvio una respuesta invalida.");
  }

  const response = responseBody as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: string;
      }>;
    }>;
  };

  const outputText =
    (typeof response.output_text === "string" ? response.output_text : null) ??
    response.output
      ?.flatMap((item) => item.content ?? [])
      .find((contentItem) => typeof contentItem.text === "string")
      ?.text;

  if (!outputText) {
    throw new HttpError(502, "No se pudo leer la extraccion estructurada del WOD.");
  }

  const parsedOutput = JSON.parse(outputText) as ExtractedWorkoutResponse;

  return {
    class: {
      ...parsedOutput.class,
      blocks: parsedOutput.class.blocks.map(stripNullFieldsFromBlock)
    }
  };
}

function stripNullFieldsFromBlock(block: BlockInput) {
  return JSON.parse(
    JSON.stringify(block, (_key, value) => (value === null ? undefined : value))
  ) as BlockInput;
}

export const interpretWodText = async (imageDataUrl: string): Promise<ExtractedWorkoutResponse> => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: buildParsingPrompt()
            }
          ]
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Parsea esta imagen de la clase y responde solo con JSON."
            },
            {
              type: "input_image",
              image_url: imageDataUrl
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          ...extractWorkoutSchema
        }
      }
    })
  });

   console.log("OpenAI response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(502, `OpenAI no pudo interpretar el texto del workout. ${errorText}`);
  }

  return extractStructuredOutput(await response.json());
};
