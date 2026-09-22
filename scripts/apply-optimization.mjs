import dotenv from "dotenv";
import postgres from "postgres";
import { readFile } from "node:fs/promises";
dotenv.config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
try {
  await sql.unsafe(await readFile(new URL("./sql/optimize_production.sql", import.meta.url), "utf8"));
  console.log("Migración aditiva aplicada. No se eliminaron registros ni se modificaron teléfonos.");
} finally { await sql.end(); }
