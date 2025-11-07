import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Hashed
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    dob: { type: Date },
    avatar: { type: String }, // Cloudinary URL
    onlineStatus: { type: Boolean, default: false },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    unreadCounts: { type: Map, of: Number, default: {} }, // chatId: unread count
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);
