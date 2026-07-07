import Link from "../models/Link.js";
import ClickEvent from "../models/ClickEvent.js";

/**
 * GET /api/analytics/:id
 *
 * Per-link analytics for a single link owned by the user.
 */
export const getLinkAnalytics = async (req, res) => {
  try {
    const link = await Link.findOne({ _id: req.params.id, ownerId: req.userId });
    if (!link) return res.status(404).json({ message: "Link not found" });

    const matchStage = { $match: { linkId: link._id } };

    const [deviceBreakdown, browserBreakdown, referrerBreakdown, dailyClicks] =
      await Promise.all([
        ClickEvent.aggregate([
          matchStage,
          { $group: { _id: "$deviceType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        ClickEvent.aggregate([
          matchStage,
          { $group: { _id: "$browser", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        ClickEvent.aggregate([
          matchStage,
          { $group: { _id: "$referrer", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        ClickEvent.aggregate([
          matchStage,
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 30 },
        ]),
      ]);

    res.json({
      linkId: link._id,
      shortCode: link.shortCode,
      longUrl: link.longUrl,
      totalClicks: link.clicks,
      deviceBreakdown,
      browserBreakdown,
      referrerBreakdown,
      dailyClicks,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Supported range presets. Value = number of days to look back.
 * "all" => no lower time bound.
 */
const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

function resolveStartDate(range) {
  const days = RANGE_DAYS[range];
  if (!days) return null; // "all" or unknown => no lower bound
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * GET /api/analytics/overview?range=7d|30d|90d|all
 *
 * Account-wide analytics aggregated across ALL of the logged-in user's links,
 * filtered by the selected time range (based on ClickEvent.timestamp).
 */
export const getOverview = async (req, res) => {
  try {
    const range = RANGE_DAYS[req.query.range] !== undefined ? req.query.range : "7d";
    const startDate = resolveStartDate(range);

    // 1. All links owned by this user
    const links = await Link.find({ ownerId: req.userId })
      .select("_id shortCode longUrl clicks isActive createdAt")
      .lean();

    const linkIds = links.map((l) => l._id);

    // Account-level summary that does not depend on ClickEvents in range
    const totalLinks = links.length;
    const activeLinks = links.filter((l) => l.isActive).length;

    // No links yet => return an empty-but-valid shape
    if (linkIds.length === 0) {
      return res.json({
        range,
        summary: { totalClicks: 0, totalLinks: 0, activeLinks: 0, uniqueVisitors: 0 },
        clicksOverTime: [],
        devices: [],
        browsers: [],
        operatingSystems: [],
        topReferrers: [],
        topLinks: [],
      });
    }

    // 2. Build the click-event match (time-bounded)
    const match = { linkId: { $in: linkIds } };
    if (startDate) match.timestamp = { $gte: startDate };

    // 3. One pipeline, many breakdowns via $facet
    const [facet] = await ClickEvent.aggregate([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalClicks: { $sum: 1 },
                uniqueVisitors: { $addToSet: "$ipHash" },
              },
            },
            {
              $project: {
                _id: 0,
                totalClicks: 1,
                uniqueVisitors: { $size: "$uniqueVisitors" },
              },
            },
          ],
          clicksOverTime: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", count: 1 } },
          ],
          devices: [
            { $group: { _id: "$deviceType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $project: { _id: 0, name: { $ifNull: ["$_id", "unknown"] }, count: 1 } },
          ],
          browsers: [
            { $group: { _id: "$browser", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, name: { $ifNull: ["$_id", "Unknown"] }, count: 1 } },
          ],
          operatingSystems: [
            { $group: { _id: "$os", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, name: { $ifNull: ["$_id", "Unknown"] }, count: 1 } },
          ],
          topReferrers: [
            { $group: { _id: "$referrer", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 8 },
            { $project: { _id: 0, name: { $ifNull: ["$_id", "Direct"] }, count: 1 } },
          ],
        },
      },
    ]);

    const totals = facet.totals[0] || { totalClicks: 0, uniqueVisitors: 0 };

    // 4. Top links by clicks (from Link docs, not range-bounded — lifetime clicks)
    const topLinks = [...links]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map((l) => ({
        shortCode: l.shortCode,
        longUrl: l.longUrl,
        clicks: l.clicks,
      }));

    res.json({
      range,
      summary: {
        totalClicks: totals.totalClicks,
        totalLinks,
        activeLinks,
        uniqueVisitors: totals.uniqueVisitors,
      },
      clicksOverTime: facet.clicksOverTime,
      devices: facet.devices,
      browsers: facet.browsers,
      operatingSystems: facet.operatingSystems,
      topReferrers: facet.topReferrers,
      topLinks,
    });
  } catch (err) {
    console.error("[Analytics] Failed to build overview:", err);
    res.status(500).json({ message: "Failed to load analytics." });
  }
};
