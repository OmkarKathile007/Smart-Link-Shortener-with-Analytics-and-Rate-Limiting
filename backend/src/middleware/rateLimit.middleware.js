import rateLimit from "express-rate-limit";

export function resolveLimits(env = process.env) {
  return {
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    limit: Number(env.RATE_LIMIT_MAX_REQUESTS) || 100,
  };
}

const { windowMs, limit } = resolveLimits();

const apiLimiter = rateLimit({
  windowMs,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests from this IP, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many auth attempts, please try again after 15 minutes." },
});

export default apiLimiter;
