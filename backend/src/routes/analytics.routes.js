import express from "express";
import protect from "../middleware/auth.middleware.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { getOverview, getLinkAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

// Account-wide overview — must be declared BEFORE "/:id" so it is not
// matched as an :id param.
router.get("/overview", protect, getOverview);

// Per-link analytics
router.get("/:id", protect, validateObjectId, getLinkAnalytics);

export default router;
