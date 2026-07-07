import mongoose from "mongoose";

const clickEventSchema = new mongoose.Schema(
  {
    linkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Link",
      required: true,
    },


    ipHash: {
      type: String,
    },


    referrer: {
      type: String,
      default: "Direct",
      trim: true,
    },

   
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
  
    timestamps: false,
    versionKey: false,
  }
);


clickEventSchema.index({ linkId: 1, timestamp: -1 });

export default mongoose.model("ClickEvent", clickEventSchema);
