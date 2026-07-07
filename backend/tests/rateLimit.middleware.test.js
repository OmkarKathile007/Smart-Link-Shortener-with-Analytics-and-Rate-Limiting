import {test} from "node:test";
import assert from "node:assert/strict";
import {resolveLimits} from "../src/middleware/rateLimit.middleware.js";


test("reads the max-requests env var",()=>{
    const {limit}=resolveLimits({RATE_LIMIT_MAX_REQUESTS:"5"});
    assert.equal(limit,5);
})


