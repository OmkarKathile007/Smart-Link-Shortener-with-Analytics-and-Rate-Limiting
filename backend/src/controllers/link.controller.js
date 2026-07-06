import Link from "../models/Link.js";
import isValidUrl from "../utils/isValidUrl.js";
import { createLinkWithUniqueCode } from "../services/shortCode.service.js";

export const createLink = async (req, res) => {
  const { longUrl, customAlias, expiresAt } = req.body;

  if (!longUrl || !isValidUrl(longUrl)) {
    return res.status(400).json({
      message: "Valid URL required",
    });
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
    res.status(err.statusCode || 500).json({
      message: err.message,
    });
  }
};

export const getMyLinks = async (req, res) => {
  const links = await Link.find({
    ownerId: req.userId,
  }).sort({
    createdAt: -1,
  });

  res.json(links);
};

export const getSingleLink = async (req, res) => {
  const link = await Link.findOne({
    _id: req.params.id,
    ownerId: req.userId,
  });

  if (!link) {
    return res.status(404).json({
      message: "Link not found",
    });
  }

  res.json(link);
};

export const updateLink = async (req, res) => {
  const link = await Link.findOneAndUpdate(
    {
      _id: req.params.id,
      ownerId: req.userId,
    },
    req.body,
    {
      new: true,
    }
  );

  if (!link) {
    return res.status(404).json({
      message: "Link not found",
    });
  }

  res.json(link);
};

export const deleteLink = async (req, res) => {
  const link = await Link.findOneAndDelete({
    _id: req.params.id,
    ownerId: req.userId,
  });

  if (!link) {
    return res.status(404).json({
      message: "Link not found",
    });
  }

  res.json({
    message: "Link deleted",
  });
};

export const toggleLinkStatus = async (req, res) => {
  const link = await Link.findOne({
    _id: req.params.id,
    ownerId: req.userId,
  });

  if (!link) {
    return res.status(404).json({
      message: "Link not found",
    });
  }

  link.isActive = !link.isActive;

  await link.save();

  res.json(link);
};