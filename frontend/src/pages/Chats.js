import React, { useState, useEffect } from "react";
import api from "../utils/api";
import UserSearchModal from "../components/UserSearchModal";
import "./Chats.css";

const Chats = ({ onSelectChat, activeChatId }) => {
  const [chats, setChats] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [chatsRes, userRes] = await Promise.all([
          api.get("/chats"),
          api.get("/users/profile"),
        ]);
        setChats(chatsRes.data.chats);
        setCurrentUser(userRes.data.user);
      } catch (error) {
        console.error("Data load failed", error);
      }
    };
    fetchData();
  }, []);

  const handleUserSelect = async (user) => {
    try {
      const response = await api.post("/chats/create", {
        type: "direct",
        participants: [user._id || user.id],
      });
      const res = await api.get("/chats");
      setChats(res.data.chats);

      setIsModalOpen(false);
      onSelectChat(response.data.chatId);
    } catch (error) {
      console.error("Create chat failed", error);
      alert("Failed to create chat");
    }
  };

  const getChatName = (chat) => {
    if (chat.name) return chat.name;
    if (chat.type === "direct" || chat.participants.length === 2) {
      const other = chat.participants.find((p) => p._id !== currentUser?._id);
      return other ? other.fullName || other.username : "Chat";
    }
    return "Group Chat";
  };

  return (
    <div className="chats-sidebar">
      <div className="chats-header">
        <h2 style={{ marginLeft: "30px", textIndent: "15px" }}>Chats</h2>
      </div>

      <ul className="chat-list">
        {chats.length === 0 && (
          <p className="no-chats-placeholder">
            No chats yet. Start a new conversation!
          </p>
        )}

        {chats.map((chat) => {
          const chatName = getChatName(chat);
          const chatId = chat._id || chat.id;

          return (
            <li
              key={chatId}
              className={`chat-item ${activeChatId === chatId ? "active" : ""}`}
              onClick={() => onSelectChat(chatId)}
            >
              <div className="chat-avatar-placeholder">
                {chatName[0]?.toUpperCase() || "C"}
              </div>
              <div className="chat-info">
                <div className="chat-name-row">
                  <span className="chat-name">{chatName}</span>
                  {chat.lastMessageTime && (
                    <span className="chat-time">
                      {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <div className="chat-preview">
                  {chat.unreadCount > 0 ? (
                    <span className="unread-text">
                      {chat.unreadCount} new messages
                    </span>
                  ) : (
                    <span className="no-unread">View conversation</span>
                  )}
                </div>
              </div>
              {chat.unreadCount > 0 && (
                <div className="chat-unread-badge">{chat.unreadCount}</div>
              )}
            </li>
          );
        })}
      </ul>

      <UserSearchModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleUserSelect}
        title="New Chat (Friends)"
        searchMode="friends"
      />
    </div>
  );
};

export default Chats;
