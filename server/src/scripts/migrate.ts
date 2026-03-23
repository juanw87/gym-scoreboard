import { pool } from "../db";
import { runSqlFile } from "./run-sql-file";

async function main() {
  await runSqlFile("schema.sql");
  console.log("Database schema applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
