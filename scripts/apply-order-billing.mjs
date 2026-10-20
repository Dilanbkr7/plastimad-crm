import dotenv from "dotenv";
import postgres from "postgres";
import { readFile } from "node:fs/promises";

dotenv.config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
try {
  const migration = await readFile(new URL("./sql/order_billing.sql", import.meta.url), "utf8");
  await sql.begin(async (tx) => {
    await tx`SET LOCAL lock_timeout = '5s'`;
    await tx`SET LOCAL statement_timeout = '15s'`;
    await tx.unsafe(migration);
  });
  console.log("Columnas de facturación disponibles. Pedidos anteriores conservados.");
} finally {
  await sql.end();
}
