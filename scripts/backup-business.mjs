import dotenv from "dotenv";
import postgres from "postgres";
import { mkdir, writeFile } from "node:fs/promises";
dotenv.config({ path: ".env.local", quiet: true });
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 10 });
try {
  const backup = await sql.begin("isolation level repeatable read read only", async (tx) => {
    await tx`set local statement_timeout = '30000ms'`;
    const tables = await tx`select tablename from pg_tables where schemaname='public' order by tablename`;
    const data = {};
    for (const { tablename } of tables) data[tablename] = await tx`select * from ${tx(tablename)}`;
    return { format: "plastimad-business-backup-v1", createdAt: new Date().toISOString(), data };
  });
  await mkdir(".backups", { recursive: true });
  const path = `.backups/business-${Date.now()}.json`;
  await writeFile(path, JSON.stringify(backup), { flag: "wx" });
  console.log(JSON.stringify({ path, tables: Object.fromEntries(Object.entries(backup.data).map(([key, rows]) => [key, rows.length])) }));
} finally { await sql.end(); }
