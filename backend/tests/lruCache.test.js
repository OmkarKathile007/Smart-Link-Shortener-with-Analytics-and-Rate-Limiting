import { test } from "node:test";
import assert from "node:assert/strict";
import LruCache from "../src/utils/LruCache.js";

test("stores and returns a value before it expires", () => {
  const cache = new LruCache({ maxSize: 5, ttlMs: 1000 });
  cache.set("a", 1);
  assert.equal(cache.get("a"), 1);
});

test("returns null for a missing key", () => {
  const cache = new LruCache();
  assert.equal(cache.get("nope"), null);
});

test("expires an entry after its TTL, from write time", (t) => {
  t.mock.timers.enable({ apis: ["Date"] });
  const cache = new LruCache({ maxSize: 5, ttlMs: 1000 });

  cache.set("a", 1);
  assert.equal(cache.get("a"), 1);


  t.mock.timers.tick(900);
  assert.equal(cache.get("a"), 1);

  t.mock.timers.tick(200); 
  assert.equal(cache.get("a"), null);
});

test("evicts the least-recently-used entry when full", () => {
  const cache = new LruCache({ maxSize: 2, ttlMs: 10_000 });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a"); 
  cache.set("c", 3); 

  assert.equal(cache.get("b"), null);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("c"), 3);
  assert.equal(cache.size, 2);
});

test("delete removes an entry immediately", () => {
  const cache = new LruCache();
  cache.set("a", 1);
  cache.delete("a");
  assert.equal(cache.get("a"), null);
});

test("stats() tracks hits and misses", () => {
  const cache = new LruCache({ maxSize: 5, ttlMs: 1000 });
  cache.set("a", 1);
  cache.get("a"); 
  cache.get("b");

  const stats = cache.stats();
  assert.equal(stats.hits, 1);
  assert.equal(stats.misses, 1);
  assert.equal(stats.hitRate, 0.5);
});
