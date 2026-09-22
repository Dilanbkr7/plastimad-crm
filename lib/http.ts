export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function readBoundedJson(request: Request, maxBytes = 16_384) {
  const origin = request.headers.get("origin");
  // Netlify may use the immutable deployment URL internally for custom-domain requests.
  // Never trust client-supplied forwarded-host headers to expand this allowlist.
  const allowedOrigins = new Set([
    new URL(request.url).origin,
    "https://plastimadshop.com",
    "https://www.plastimadshop.com",
  ]);
  for (const configuredUrl of [process.env.URL, process.env.DEPLOY_URL, process.env.DEPLOY_PRIME_URL]) {
    if (configuredUrl) {
      try { allowedOrigins.add(new URL(configuredUrl).origin); } catch { /* Ignore invalid platform URLs. */ }
    }
  }
  if (origin && !allowedOrigins.has(origin)) throw new RequestError(403, "Origen no permitido.");
  if (!request.headers.get("content-type")?.includes("application/json")) throw new RequestError(415, "Se requiere JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "Solicitud vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestError(413, "La solicitud excede el tamaño permitido.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const data: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || Array.isArray(data) || typeof data !== "object") throw new Error();
    return data as Record<string, unknown>;
  } catch { throw new RequestError(400, "JSON inválido."); }
}
