import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "./config";
import { HttpError } from "./errors";
import { router } from "./routes";

const app = express();

function collectErrorCodes(error: unknown): string[] {
  if (!error || typeof error !== "object") {
    return [];
  }

  const candidate = error as {
    code?: unknown;
    errors?: unknown;
  };
  const codes = typeof candidate.code === "string" ? [candidate.code] : [];

  if (Array.isArray(candidate.errors)) {
    return [...codes, ...candidate.errors.flatMap((nestedError) => collectErrorCodes(nestedError))];
  }

  return codes;
}

function isDatabaseConnectionError(error: unknown) {
  const codes = collectErrorCodes(error);

  return codes.some((code) =>
    ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EAI_AGAIN", "57P01"].includes(code)
  );
}

app.use(
  cors({
    origin: env.CLIENT_URL
  })
);
app.use(express.json());

app.use("/api", router);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: error.issues[0]?.message ?? "Invalid request payload."
    });
    return;
  }

  if (error instanceof HttpError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (isDatabaseConnectionError(error)) {
    response.status(503).json({
      error: "No se pudo conectar a la base de datos. Verifica que PostgreSQL este corriendo."
    });
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error.";
  response.status(500).json({ error: message });
});

app.listen(env.PORT, () => {
  console.log(`API ready on http://localhost:${env.PORT}`);
});
