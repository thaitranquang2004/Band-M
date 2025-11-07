import mongoose from "mongoose";

const messageSeenSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    seenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("MessageSeen", messageSeenSchema);
