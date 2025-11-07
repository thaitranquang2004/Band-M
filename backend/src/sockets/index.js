export default (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinChats", (userId) => {
      // Query user's chats and join
      // socket.join(`chat_${chatId}`);
    });

    socket.on("newMessage", (data) => {
      io.to(`chat_${data.chatId}`).emit("newMessage", data);
    });

    // Other events...
  });
};
