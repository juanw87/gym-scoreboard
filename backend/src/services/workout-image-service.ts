import { HttpError } from "../errors";
import { env } from "../config";
import { interpretWodText } from "../agents/parser-agent";
import { CrossfitClassSchema } from "../validators/workout.validator";

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

export async function extractWorkoutFromImage(imageDataUrl: string) { 

  if (!env.OPENAI_API_KEY) {
    throw new HttpError(503, "Falta configurar OPENAI_API_KEY para procesar imagenes.");
  }

  assertSupportedImage(imageDataUrl);

  // semantic parsing directly from the image with openai
  const extractedWorkout = await interpretWodText(imageDataUrl);

  console.log("PARSED WOD:", JSON.stringify(extractedWorkout, null, 2));

  // zod validation of the extracted data with a clear error message if it doesn't match the schema
  
  const workoutDate = normalizeDate(extractedWorkout.class.date);

  console.log("NORMALIZED DATE:", workoutDate);


  const normalizedPayload = CrossfitClassSchema.parse({
    class: {
      date: workoutDate,
      name: extractedWorkout.class.name,
      blocks: extractedWorkout.class.blocks
    }
  });

  console.log("NORMALIZED PAYLOAD:", JSON.stringify(normalizedPayload, null, 2));

 // final json to save

  return {
    workoutDate: normalizedPayload.class.date,
    blocks: normalizedPayload.class.blocks,
    usedFallbackDate: extractedWorkout.class.date === null
  };
}
