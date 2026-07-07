import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import ClickEvent from "../models/ClickEvent.js";
import Link from "../models/Link.js";

// .env me IP_HASH_SALT define karo (ya fallback use hoga)
const SALT = process.env.IP_HASH_SALT || "sls_default_salt_change_in_prod";

/**
 * IP ko one-way SHA-256 hash me convert karo.
 * GDPR concern: raw IP kabhi DB me nahi jayegi.
 * Same visitor detect karne ke liye hash kaafi hai.
 */
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + SALT).digest("hex");
}

/**
 * User-Agent string se device type, browser, OS nikalo.
 * ua-parser-js library use kar raha hai.
 */
function parseUserAgent(uaString) {
  if (!uaString) {
    return { deviceType: "unknown", browser: "Unknown", os: "Unknown" };
  }

  const parser = new UAParser(uaString);
  const result = parser.getResult();

  // Bot detection (crawlers, scrapers)
  const botPattern = /bot|crawl|spider|slurp|mediapartners/i;
  if (botPattern.test(uaString)) {
    return {
      deviceType: "bot",
      browser: result.browser.name || "Bot",
      os: result.os.name || "Unknown",
    };
  }

  // Device type determine karo
  let deviceType = "desktop";
  if (result.device.type === "mobile") deviceType = "mobile";
  else if (result.device.type === "tablet") deviceType = "tablet";

  return {
    deviceType,
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
  };
}

/**
 * Referrer URL ko clean karo — sirf domain rakhna zyada useful hai analytics me.
 * Agar referrer nahi aaya → "Direct"
 */
function cleanReferrer(referer) {
  if (!referer) return "Direct";
  try {
    const url = new URL(referer);
    // sirf hostname rakho (e.g. "google.com"), full path nahi
    return url.hostname;
  } catch {
    return referer.slice(0, 200); // invalid URL ho toh raw string, max 200 chars
  }
}

/**
 * Click event record karo aur link ka total click count badhao.
 * Yeh fire-and-forget function hai — redirect ke baad call hogi, await nahi karenge.
 *
 * @param {string} linkId - MongoDB ObjectId of the Link
 * @param {{ ip: string, userAgent: string, referer: string }} meta
 */
async function recordClick(linkId, { ip, userAgent, referer }) {
  const { deviceType, browser, os } = parseUserAgent(userAgent);

  await ClickEvent.create({
    linkId,
    ipHash: hashIp(ip),
    referrer: cleanReferrer(referer),
    deviceType,
    browser,
    os,
    timestamp: new Date(),
  });

  // Link ka total click counter atomically increment karo
  // $inc safe hai — race conditions nahi hongi
  await Link.findByIdAndUpdate(linkId, { $inc: { clicks: 1 } });
}

export { recordClick };
