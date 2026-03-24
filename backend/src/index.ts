import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "./config";
import { HttpError } from "./errors";
import { router } from "./routes";

const app = express();

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

  const message = error instanceof Error ? error.message : "Internal server error.";
  response.status(500).json({ error: message });
});

app.listen(env.PORT, () => {
  console.log(`API ready on http://localhost:${env.PORT}`);
});
