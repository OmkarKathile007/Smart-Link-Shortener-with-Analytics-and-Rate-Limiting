import Link from "../models/Link.js";
import { recordClick } from "../services/click.service.js";
import {
  getCachedLink,
  cacheLink,
  invalidateLink,
} from "../services/linkCache.service.js";

/**
 * GET /s/:code
 *
 * Redirect flow:
 * 1. Look up the link in the in-memory hot-link cache first.
 * 2. On a cache miss, read from MongoDB and warm the cache (healthy links only).
 * 3. Reject inactive / expired links with a friendly 410.
 * 4. Send the 302 redirect immediately.
 * 5. Record the click as fire-and-forget so the redirect stays fast.
 *
 * Why 302, not 301?
 * - 301 (Permanent) is cached by the browser, so later clicks never reach the
 *   server and no analytics are recorded.
 * - 302 (Temporary) makes the browser hit us every time, so click analytics
 *   stay accurate.
 */
export const redirectToLongUrl = async (req, res) => {
  const { code } = req.params;

  try {

    let link = getCachedLink(code);
    const fromCache = link !== null;

   
    if (!link) {
      link = await Link.findOne({ shortCode: code });

      if (!link) {
        return res.status(404).json({
          success: false,
          message: "Short link not found.",
        });
      }
    }

    
    const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
    if (!link.isActive || isExpired) {
      if (fromCache) invalidateLink(code);
      return res.status(410).json({
        success: false,
        message: "This link has expired or been deactivated.",
        code: "LINK_GONE",
      });
    }


    if (!fromCache) cacheLink(code, link);

   
    res.redirect(302, link.longUrl);

    recordClick(link._id, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      referer: req.headers["referer"] || req.headers["referrer"],
    }).catch((err) => {
      console.error(`[ClickLog] Failed to record click for ${code}:`, err.message);
    });
  } catch (err) {
    console.error("[Redirect] Unexpected error:", err);
    // If the redirect already went out, the response is sent — don't double-send.
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    }
  }
};
