import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * Carga las variables guardadas en .env.local.
 */
config({
  path: ".env.local",
});

/**
 * Drizzle Kit utiliza una conexión de sesión
 * para ejecutar migraciones sobre PostgreSQL.
 */
const migrationDatabaseUrl =
  process.env.MIGRATION_DATABASE_URL;

if (!migrationDatabaseUrl) {
  throw new Error(
    "No se encontró MIGRATION_DATABASE_URL en .env.local.",
  );
}

/**
 * Configuración de Drizzle Kit.
 */
export default defineConfig({
  /**
   * Motor de base de datos.
   */
  dialect: "postgresql",

  /**
   * Archivo donde están declaradas las tablas.
   */
  schema: "./lib/schema.ts",

  /**
   * Carpeta donde se almacenan las migraciones SQL.
   */
  out: "./drizzle",

  /**
   * Solo se administra el esquema public.
   */
  schemaFilter: ["public"],

  /**
   * Conexión utilizada exclusivamente
   * para migraciones.
   */
  dbCredentials: {
    url: migrationDatabaseUrl,
  },

  /**
   * Muestra información detallada.
   */
  verbose: true,

  /**
   * Exige confirmaciones en operaciones delicadas.
   */
  strict: true,
});