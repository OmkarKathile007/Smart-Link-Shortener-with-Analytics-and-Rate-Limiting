

import { test } from "node:test";
import assert from "node:assert/strict";

process.env.RATE_LIMIT_MAX_REQUESTS = "100";
process.env.RATE_LIMIT_WINDOW_MS = "60000";

test("global limiter allows N requests, then returns 429", async () => {

  const { default: app } = await import("../src/app.js");
  const server = app.listen(0);             
  const { port } = server.address();
  const url = `http://localhost:${port}/`;

  const results = [];
  for (let i = 0; i < 100; i++) {
    const res = await fetch(url);
    results.push({ status: res.status, rateLimit: res.headers.get("RateLimit") });
  }
  server.close();


  assert.deepEqual(results.map((r) => r.status), [200, 200, 200, 429]);
  assert.ok(results[3].rateLimit, "the 429 must carry a RateLimit header");
});
