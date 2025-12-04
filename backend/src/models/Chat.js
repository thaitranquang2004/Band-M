import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    name: { type: String },
    type: { type: String, enum: ["direct", "group"], default: "direct" },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);
