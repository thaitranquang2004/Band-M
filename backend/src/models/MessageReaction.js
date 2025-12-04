import mongoose from "mongoose";

const messageReactionSchema = new mongoose.Schema(
  {
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reactionType: { type: String, required: true }, //'heart', 'like'
  },
  { timestamps: true }
);

export default mongoose.model("MessageReaction", messageReactionSchema);
