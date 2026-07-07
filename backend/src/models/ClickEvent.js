import mongoose from "mongoose";

const clickEventSchema = new mongoose.Schema(
  {
    linkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Link",
      required: true,
    },

    // Hashed IP for privacy (SHA-256 + salt) — raw IP kabhi store nahi hoti
    ipHash: {
      type: String,
    },

    // Referrer URL (HTTP Referer header se)
    referrer: {
      type: String,
      default: "Direct",
      trim: true,
    },

    // ua-parser-js se extracted device info
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "bot", "unknown"],
      default: "unknown",
    },
    browser: {
      type: String,
      default: "Unknown",
    },
    os: {
      type: String,
      default: "Unknown",
    },

    // Optional: country code (e.g. "IN", "US") — future use ke liye
    country: {
      type: String,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // createdAt/updatedAt ki zaroorat nahi, timestamp field khud manage kar raha hai
    timestamps: false,
    versionKey: false,
  }
);

// Compound index — analytics aggregation queries is index se fast hongi
// { linkId: 1, timestamp: -1 } → "is link ke recent clicks" fast milenge
clickEventSchema.index({ linkId: 1, timestamp: -1 });

export default mongoose.model("ClickEvent", clickEventSchema);
