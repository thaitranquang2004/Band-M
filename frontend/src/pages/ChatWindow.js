import React, { useState, useEffect, useRef } from "react";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import { Send, Smile } from "lucide-react";
import "./ChatWindow.css";

const ChatWindow = ({ chatId }) => {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [chatInfo, setChatInfo] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const { socket } = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/users/profile");
        setCurrentUser(res.data.user);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        const response = await api.get(`/messages/${chatId}`);
        setMessages(response.data.messages);
        scrollToBottom();
      } catch (error) {
        console.error("Messages load failed", error);
      }
    };

    fetchMessages();

    if (socket) {
      const handleNewMessage = (msg) => {
        // Check if message belongs to current chat
        if (msg.chat === chatId || msg.chatId === chatId) {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        }
      };

      socket.on("newMessage", handleNewMessage);

      socket.on("messageEdited", (msg) => {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msg.messageId
              ? { ...m, content: msg.content, isEdited: true }
              : m
          )
        );
      });

      socket.on("messageDeleted", (msg) => {
        setMessages((prev) => prev.filter((m) => m._id !== msg.messageId));
      });

      socket.on("messageReactionUpdate", ({ messageId, reactions }) => {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
        );
      });

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("messageEdited");
        socket.off("messageDeleted");
        socket.off("messageReactionUpdate");
      };
    }
  }, [chatId, socket]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    try {
      await api.post("/messages/send", { chatId, content });
      setContent("");
    } catch (error) {
      console.error("Send failed", error);
      alert("Failed to send message");
    }
  };

  const handleReaction = async (messageId, type) => {
    try {
      await api.post(`/messages/${messageId}/react`, { type });
    } catch (error) {
      console.error("Reaction failed", error);
    }
  };

  // Fetch chat details
  useEffect(() => {
    if (!chatId) return;
    const fetchChatDetails = async () => {
      try {
        const res = await api.get("/chats");
        const found = res.data.chats.find(
          (c) => c._id === chatId || c.id === chatId
        );
        if (found) {
          // Determine name
          let name = found.name;
          if (found.type === "direct" || !name) {
            const other = found.participants.find(
              (p) => p._id !== currentUser?._id
            );
            name = other ? other.fullName || other.username : "Chat";
          }
          setChatInfo({ ...found, name });
        }
      } catch (err) {
        console.error("Failed to fetch chat details", err);
      }
    };
    if (currentUser) fetchChatDetails();
  }, [chatId, currentUser]);

  if (!chatId) {
    return (
      <div className="chat-window empty-chat">
        <i className="fas fa-comments"></i>
        <h3>Select a chat to start messaging</h3>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="header-user-info">
          <div className="header-avatar">
            <span>{chatInfo?.name?.[0]?.toUpperCase() || "#"}</span>
          </div>
          <div className="header-details">
            <span className="header-name">
              {chatInfo?.name || "Loading..."}
            </span>
          </div>
        </div>
        <div className="header-actions"></div>
      </div>

      <div className="messages-container">
        {messages.map((msg) => {
          const isSent =
            msg.sender._id === currentUser?._id ||
            msg.sender === currentUser?._id;
          const senderName =
            msg.sender.username || msg.sender.fullName || "User";

          return (
            <div
              key={msg._id || msg.id}
              className={`message-group ${isSent ? "sent" : "received"}`}
            >
              <div className="message-bubble-container">
                <div className="message-bubble">
                  {/* Ensure content is string */}
                  {typeof msg.content === "string"
                    ? msg.content
                    : JSON.stringify(msg.content)}
                </div>
                <div className="reaction-actions">
                  {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-btn-mini"
                      onClick={() => handleReaction(msg._id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              {msg.reactions && msg.reactions.length > 0 && (
                <div className="message-reactions">
                  {msg.reactions.map((r, idx) => (
                    <span
                      key={idx}
                      className="reaction-item"
                      title={r.user?.username}
                    >
                      {r.type}
                    </span>
                  ))}
                </div>
              )}
              <div className="message-info">
                {!isSent && <span className="sender-name">{senderName}</span>}
                <span className="message-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-area">
        <form className="input-wrapper" onSubmit={sendMessage}>
          <input
            type="text"
            className="message-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="send-button"
            disabled={!content.trim()}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
