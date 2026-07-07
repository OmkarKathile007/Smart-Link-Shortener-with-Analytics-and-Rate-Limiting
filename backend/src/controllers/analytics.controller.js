import Link from "../models/Link.js";
import ClickEvent from "../models/ClickEvent.js";

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
