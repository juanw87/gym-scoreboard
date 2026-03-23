import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  CLIENT_URL: z.string().default("http://localhost:3000")
});

export const env = envSchema.parse(process.env);
