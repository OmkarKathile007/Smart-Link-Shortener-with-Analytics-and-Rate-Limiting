import Link from "../models/Link.js";
import isValidUrl from "../utils/isValidUrl.js";
import { createLinkWithUniqueCode } from "../services/shortCode.service.js";
import { invalidateLink } from "../services/linkCache.service.js";

export const createLink = async (req, res) => {
  const { longUrl, customAlias, expiresAt } = req.body;

  if (!longUrl || !isValidUrl(longUrl)) {
    return res.status(400).json({ message: "Valid URL required" });
  }

  try {
    const link = await createLinkWithUniqueCode({
      ownerId: req.userId,
      longUrl,
      customAlias,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
    res.status(201).json(link);
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message });
  }
};

export const getMyLinks = async (req, res) => {
  try {
    const links = await Link.find({ ownerId: req.userId }).sort({ createdAt: -1 });
    res.json(links);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSingleLink = async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!link) return res.status(404).json({ message: "Link not found" });
    res.json(link);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateLink = async (req, res) => {
  try {
    const { longUrl, customAlias, expiresAt, isActive } = req.body;

    const allowedUpdates = {};
    if (longUrl !== undefined) {
      if (!isValidUrl(longUrl)) {
        return res.status(400).json({ message: "Valid URL required" });
      }
      allowedUpdates.longUrl = longUrl;
    }
    if (customAlias !== undefined) allowedUpdates.customAlias = customAlias;
    if (expiresAt !== undefined) allowedUpdates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (isActive !== undefined) allowedUpdates.isActive = isActive;

    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.userId },
      allowedUpdates,
      { new: true }
    );

    if (!link) return res.status(404).json({ message: "Link not found" });
    // The redirect target may have changed — drop the cached entry.
    invalidateLink(link.shortCode);
    res.json(link);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteLink = async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({ _id: req.params.id, ownerId: req.userId });
    if (!link) return res.status(404).json({ message: "Link not found" });
    invalidateLink(link.shortCode);
    res.json({ message: "Link deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const toggleLinkStatus = async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!link) return res.status(404).json({ message: "Link not found" });
    link.isActive = !link.isActive;
    await link.save();
    // isActive flipped — a cached entry would keep redirecting; invalidate it.
    invalidateLink(link.shortCode);
    res.json(link);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};