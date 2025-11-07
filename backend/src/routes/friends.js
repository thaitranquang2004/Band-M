import express from "express";
import { authJWT } from "../middleware/auth.js";
import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";

const router = express.Router();

// Send request
router.post("/request", authJWT, async (req, res) => {
  try {
    const { receiverId } = req.body;
    const existing = await FriendRequest.findOne({
      sender: req.user._id,
      receiver: receiverId,
    });
    if (existing) return res.status(400).json({ message: "Request exists" });

    const request = new FriendRequest({
      sender: req.user._id,
      receiver: receiverId,
    });
    await request.save();

    // Emit Socket (assume io in controller, or pass via req)
    req.io
      ?.to(receiverId.toString())
      .emit("friendRequest", { requestId: request._id });

    res.json({ message: "Sent", requestId: request._id });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Incoming requests
router.get("/requests/incoming", authJWT, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: "pending",
    }).populate("sender", "username fullName avatar");
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Accept
router.put("/request/:requestId/accept", authJWT, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request || request.receiver.toString() !== req.user._id.toString())
      return res.status(404).json({ message: "Not found" });

    request.status = "accepted";
    await request.save();

    // Add to friends
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { friends: request.sender },
    });
    await User.findByIdAndUpdate(request.sender, {
      $addToSet: { friends: req.user._id },
    });

    req.io
      ?.to(request.sender.toString())
      .emit("friendAccepted", { requestId: request._id });

    res.json({ message: "Accepted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Decline (tương tự accept, nhưng status='rejected', no add friends)
router.put("/request/:requestId/decline", authJWT, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request || request.receiver.toString() !== req.user._id.toString())
      return res.status(404).json({ message: "Not found" });

    request.status = "rejected";
    await request.save();

    req.io
      ?.to(request.sender.toString())
      .emit("friendDeclined", { requestId: request._id });

    res.json({ message: "Declined" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// List friends
router.get("/list", authJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "username fullName avatar onlineStatus"
    );
    res.json({ friends: user.friends });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
