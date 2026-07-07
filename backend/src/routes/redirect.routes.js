import express from "express";
import { redirectToLongUrl } from "../controllers/redirect.controller.js";

const router = express.Router();

// Public route — koi auth nahi chahiye
// GET /s/:code → longUrl pe redirect karo
router.get("/:code", redirectToLongUrl);

export default router;
