import express from "express";
import protect from "../middleware/auth.middleware.js";
import validateObjectId from "../middleware/validateObjectId.js";
import {
  createLink,
  getMyLinks,
  getSingleLink,
  updateLink,
  deleteLink,
  toggleLinkStatus,
} from "../controllers/link.controller.js";

const router = express.Router();

router.post("/", protect, createLink);
router.get("/", protect, getMyLinks);
router.get("/:id", protect, validateObjectId, getSingleLink);
router.put("/:id", protect, validateObjectId, updateLink);
router.delete("/:id", protect, validateObjectId, deleteLink);
router.patch("/:id/toggle", protect, validateObjectId, toggleLinkStatus);

export default router;