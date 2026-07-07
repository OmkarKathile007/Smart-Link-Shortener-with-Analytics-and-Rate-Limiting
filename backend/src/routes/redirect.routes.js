import express from "express";
import { redirectToLongUrl } from "../controllers/redirect.controller.js";

const router = express.Router();


router.get("/:code", redirectToLongUrl);

export default router;
