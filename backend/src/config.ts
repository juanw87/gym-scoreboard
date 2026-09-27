import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_URL: z.string().default("http://localhost:3000"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  // NEXT_PUBLIC_API_BASE_URL is frontend-only, but allow it here to avoid strict issues when sharing .env
  NEXT_PUBLIC_API_BASE_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);
