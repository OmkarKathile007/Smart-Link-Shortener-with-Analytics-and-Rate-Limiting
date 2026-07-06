import { nanoid } from "nanoid";
import Link from "../models/Link.js";

async function createLinkWithUniqueCode(data, maxRetries = 5) {
  const alias = data.customAlias?.trim().toLowerCase();

  // custom alias
  if (alias) {
    const exists = await Link.findOne({
      $or: [{ shortCode: alias }, { customAlias: alias }],
    });

    if (exists) {
      const err = new Error("Alias already taken");
      err.statusCode = 409;
      throw err;
    }

    return Link.create({
      ...data,
      customAlias: alias,
      shortCode: alias,
    });
  }

  // auto generate
  for (let i = 0; i < maxRetries; i++) {
    const code = nanoid(7);

    try {
      return await Link.create({
        ...data,
        shortCode: code,
      });
    } catch (err) {
      if (err.code === 11000 && i < maxRetries - 1) {
        continue;
      }
      throw err;
    }
  }
}

export { createLinkWithUniqueCode };