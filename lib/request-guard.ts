import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

import { RequestError } from "@/lib/http";
export { RequestError, readBoundedJson } from "@/lib/http";

async function consumeBucket(key: string, limit: number) {
  const hash = createHash("sha256").update(key).digest("hex");
  const rows = await db.execute(sql`
    INSERT INTO api_rate_limits (key_hash, window_start, hits)
    VALUES (${hash}, date_trunc('minute', now()), 1)
    ON CONFLICT (key_hash) DO UPDATE SET
      hits = CASE WHEN api_rate_limits.window_start < date_trunc('minute', now()) THEN 1 ELSE api_rate_limits.hits + 1 END,
      window_start = date_trunc('minute', now())
    WHERE api_rate_limits.window_start < date_trunc('minute', now()) OR api_rate_limits.hits < ${limit}
    RETURNING hits
  `);
  return rows.length > 0;
}

export async function guardPublicRequest(request: Request, scope: string, perMinute: number) {
  // Global budget still applies if a client rotates or forges an address header.
  const ip = (request.headers.get("x-nf-client-connection-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 80);
  if (!await consumeBucket(`${scope}:global`, 300) || !await consumeBucket(`${scope}:${ip}`, perMinute)) {
    throw new RequestError(429, "Demasiadas solicitudes. Inténtelo de nuevo en un minuto.");
  }
}

export function requestErrorResponse(error: unknown) {
  const status = error instanceof RequestError ? error.status : 503;
  return Response.json({ ok: false, message: error instanceof RequestError ? error.message : "Servicio temporalmente ocupado. Inténtelo de nuevo." }, {
    status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) },
  });
}
