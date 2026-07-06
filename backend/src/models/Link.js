import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    longUrl: {
      type: String,
      required: true,
      trim: true,
    },

    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    customAlias: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    clicks: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

linkSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: {
      expiresAt: { $type: "date" },
    },
  }
);

export default mongoose.model("Link", linkSchema);