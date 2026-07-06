import { test } from "node:test";
import assert from "node:assert/strict";
import { notFound, errorHandler } from "../src/middleware/error.middleware.js";

// Minimal Express-style res double.
const mockRes = () => {
  const res = { statusCode: 200 };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

const mockReq = () => ({ method: "GET", originalUrl: "/x" });

test("notFound forwards a 404 error to next()", () => {
  let forwarded;
  notFound({ ...mockReq(), originalUrl: "/missing" }, mockRes(), (err) => {
    forwarded = err;
  });
  assert.equal(forwarded.statusCode, 404);
  assert.match(forwarded.message, /Not Found/);
});

test("errorHandler uses the error's statusCode and message", () => {
  const err = new Error("bad request");
  err.statusCode = 400;
  const res = mockRes();
  errorHandler(err, mockReq(), res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "bad request");
});

test("errorHandler defaults to 500 when no status is set", () => {
  const res = mockRes();
  errorHandler(new Error("boom"), mockReq(), res, () => {});
  assert.equal(res.statusCode, 500);
});

test("errorHandler hides the stack trace in production", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const res = mockRes();
  errorHandler(new Error("secret"), mockReq(), res, () => {});
  assert.equal(res.body.stack, undefined);
  process.env.NODE_ENV = prev;
});
