import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import ClickEvent from "../models/ClickEvent.js";
import Link from "../models/Link.js";


const SALT = process.env.IP_HASH_SALT || "sls_default_salt_change_in_prod";


function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip + SALT).digest("hex");
}

function parseUserAgent(uaString) {
  if (!uaString) {
    return { deviceType: "unknown", browser: "Unknown", os: "Unknown" };
  }

  const parser = new UAParser(uaString);
  const result = parser.getResult();


  const botPattern = /bot|crawl|spider|slurp|mediapartners/i;
  if (botPattern.test(uaString)) {
    return {
      deviceType: "bot",
      browser: result.browser.name || "Bot",
      os: result.os.name || "Unknown",
    };
  }


  let deviceType = "desktop";
  if (result.device.type === "mobile") deviceType = "mobile";
  else if (result.device.type === "tablet") deviceType = "tablet";

  return {
    deviceType,
    browser: result.browser.name || "Unknown",
    os: result.os.name || "Unknown",
  };
}


function cleanReferrer(referer) {
  if (!referer) return "Direct";
  try {
    const url = new URL(referer);
   
    return url.hostname;
  } catch {
    return referer.slice(0, 200);
  }
}

/**

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

 
  await Link.findByIdAndUpdate(linkId, { $inc: { clicks: 1 } });
}

export { recordClick };
