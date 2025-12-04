import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children, isAuthenticated }) => {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    if (isAuthenticated && token) {
      const socketUrl =
        process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

      const newSocket = io(socketUrl, {
        auth: { token: `Bearer ${token}` },
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket error:", err.message);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });

      newSocket.on("userOnline", ({ userId }) => {
        setOnlineUsers((prev) => new Set([...prev, userId]));
      });

      newSocket.on("userOffline", ({ userId }) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        setSocket(null);
      };
    }
  }, [isAuthenticated]);

  const value = {
    socket,
    onlineUsers: Array.from(onlineUsers),
    isConnected: !!socket?.connected,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};
