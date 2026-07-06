import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

// generateToken reads JWT_SECRET at call time, so set it before importing.
process.env.JWT_SECRET = "test_secret";
const { default: generateToken } = await import("../src/utils/generateToken.js");

test("generateToken returns a JWT that verifies and carries the id", () => {
  const token = generateToken("user123");
  const decoded = jwt.verify(token, "test_secret");
  assert.equal(decoded.id, "user123");
});
