import Link from "../models/Link.js";
import { recordClick } from "../services/click.service.js";

/**
 * GET /s/:code
 *
 * Redirect flow:
 * 1. shortCode se link dhoondo (baad me cache se aayega)
 * 2. Check: exists? active? expired?
 * 3. Sab theek → 302 redirect bhejo TURANT
 * 4. Response bhejne ke BAAD, background me click record karo (fire-and-forget)
 *
 * 302 vs 301 kyun?
 * - 301 = Permanent → browser cache karta hai → agle click par server hit hi nahi hoga → click analytics record nahi hogi
 * - 302 = Temporary → browser har baar server ko hit karta hai → analytics sahi milti hai
 */
export const redirectToLongUrl = async (req, res) => {
  const { code } = req.params;

  try {
    // DB se link dhoondo — shortCode se match karo
    const link = await Link.findOne({ shortCode: code });

    // Case 1: Link exist hi nahi karta
    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Short link not found.",
      });
    }

    // Case 2: Link exist karta hai lekin inactive ya expire ho gaya
    const isExpired = link.expiresAt && link.expiresAt < new Date();
    if (!link.isActive || isExpired) {
      return res.status(410).json({
        success: false,
        message: "This link has expired or been deactivated.",
        code: "LINK_GONE",
      });
    }

    // ✅ Sab theek hai → PEHLE redirect bhejo
    res.redirect(302, link.longUrl);

    // 🔥 Fire-and-forget: redirect response gaya, ab background me click log karo
    // await nahi kar rahe — user ko wait nahi karwana
    // .catch() se errors silently log honge, server crash nahi karega
    recordClick(link._id, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      referer: req.headers["referer"] || req.headers["referrer"],
    }).catch((err) => {
      // Production me proper logger (winston/pino) use karo
      console.error(`[ClickLog] Failed to record click for ${code}:`, err.message);
    });

  } catch (err) {
    console.error("[Redirect] Unexpected error:", err);
    // Agar redirect ke baad error aaya, response already sent ho chuki hai
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    }
  }
};
