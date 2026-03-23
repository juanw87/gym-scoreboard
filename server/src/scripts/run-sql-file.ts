import { readFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../db";

export async function runSqlFile(relativeFilePath: string) {
  const absolutePath = path.resolve(__dirname, "../../sql", relativeFilePath);
  const sql = await readFile(absolutePath, "utf8");
  await pool.query(sql);
}
