import assert from "node:assert/strict";
import test from "node:test";
import { readBoundedJson, RequestError } from "../lib/http";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://plastimadshop.com/api/orders", { method: "POST", body,
    headers: { "Content-Type": "application/json", ...headers } });
}
test("body limit is enforced even when Content-Length is absent or false", async () => {
  const cases: Record<string, string>[] = [{}, { "Content-Length": "1" }];
  for (const headers of cases) {
    await assert.rejects(readBoundedJson(request(JSON.stringify({ x: "x".repeat(1000) }), headers), 50),
      (error) => error instanceof RequestError && error.status === 413);
  }
});
test("cross-origin writes, invalid JSON and primitive payloads are rejected", async () => {
  await assert.rejects(readBoundedJson(request("{}", { Origin: "https://other.example" })),
    (error) => error instanceof RequestError && error.status === 403);
  for (const body of ["null", "[]", "1", "{broken"]) await assert.rejects(readBoundedJson(request(body)),
    (error) => error instanceof RequestError && error.status === 400);
});
test("a valid same-origin request preserves its data", async () => {
  assert.deepEqual(await readBoundedJson(request('{"name":"María"}', { Origin: "https://plastimadshop.com" })), { name: "María" });
});
test("Netlify internal deployment URLs accept the public domain but not forged forwarded hosts", async () => {
  const makeRequest = (origin: string) => new Request("https://deploy--beautiful-otter-5fb5c6.netlify.app/api/orders", {
    method: "POST", body: "{}", headers: { "Content-Type": "application/json", Origin: origin,
      "X-Forwarded-Host": "other.example" },
  });
  assert.deepEqual(await readBoundedJson(makeRequest("https://plastimadshop.com")), {});
  await assert.rejects(readBoundedJson(makeRequest("https://other.example")),
    (error) => error instanceof RequestError && error.status === 403);
});
