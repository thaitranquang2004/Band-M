import mongoose from "mongoose";
import CryptoJS from "crypto-js";

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true }, // Encrypted string
    type: { type: String, enum: ["text", "media"], default: "text" },
    mediaUrl: { type: String }, // Cloudinary URL for media
    isEdited: { type: Boolean, default: false },
    deletedAt: { type: Date },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        type: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

// Hook: Encrypt content before save
messageSchema.pre("save", function (next) {
  if (this.isModified("content") && this.type === "text") {
    this.content = CryptoJS.AES.encrypt(
      this.content,
      process.env.ENCRYPT_SECRET || "default_secret"
    ).toString();
  }
  next();
});

export default mongoose.model("Message", messageSchema);
