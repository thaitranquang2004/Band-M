import User from "../../models/User.js";
import Chat from "../../models/Chat.js";

export const userHandler = (io, socket) => {
  // Join user specific room for private notifications
  socket.join(`user_${socket.user._id}`);

  // Handle User Online
  const handleUserOnline = async () => {
    try {
      await User.findByIdAndUpdate(socket.user._id, { onlineStatus: true });
      io.emit("userOnline", { userId: socket.user._id, online: true });
    } catch (err) {
      console.error("Error updating user online status:", err);
    }
  };

  // Handle User Offline
  const handleUserOffline = async () => {
    try {
      await User.findByIdAndUpdate(socket.user._id, { 
        onlineStatus: false,
        lastSeen: new Date()
      });
      io.emit("userOffline", { userId: socket.user._id, online: false });
    } catch (err) {
      console.error("Error updating user offline status:", err);
    }
  };

  // Join all chat rooms the user is part of
  const handleJoinMyChats = async () => {
    try {
      const userChats = await Chat.find({ participants: socket.user._id }).select("_id");
      userChats.forEach((chat) => {
        socket.join(`chat_${chat._id}`);
      });
      console.log(`Joined ${userChats.length} chats for user ${socket.user.username}`);
    } catch (err) {
      console.error("Error joining chats:", err);
    }
  };

  // Register events
  socket.on("joinMyChats", handleJoinMyChats);
  
  // Initial setup: Online ngay sau connect
  handleUserOnline();

  return {
    handleUserOffline,
    handleJoinMyChats 
  };
};