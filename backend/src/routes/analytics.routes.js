import express from "express";
import protect from "../middleware/auth.middleware.js";
import validateObjectId from "../middleware/validateObjectId.js";
import { getLinkAnalytics } from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/:id", protect, validateObjectId, getLinkAnalytics);

export default router;
