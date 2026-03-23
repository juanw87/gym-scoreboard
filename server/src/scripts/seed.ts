import { pool } from "../db";
import { runSqlFile } from "./run-sql-file";

async function main() {
  await runSqlFile("seed.sql");
  console.log("Seed data inserted.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
