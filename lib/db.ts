import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Obtiene la cadena privada desde .env.local.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "No se encontró DATABASE_URL. Revisa .env.local.",
  );
}

/**
 * Cliente PostgreSQL.
 */
const client = postgres(connectionString, {
  /**
   * Necesario para el Transaction Pooler
   * de Supabase en el puerto 6543.
   */
  prepare: false,

  /**
   * Limita las conexiones durante el desarrollo.
   */
  max: 1,
});

/**
 * Conexión utilizada por las API del CRM.
 */
export const db = drizzle(client, {
  schema,
});