import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // Thêm useNavigate cho redirect
import api from "../utils/api"; // Adjust path nếu cần
import socket from "../utils/socket"; // Import named nếu default null
import "./Friends.css";

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [myFriendIds, setMyFriendIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true); // Loading state mới
  const [error, setError] = useState(""); // Error state
  const navigate = useNavigate(); // Cho redirect

  // --- Auth guard: Check token trước fetch ---
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      console.log(
        "Auth check - Token exists:",
        !!token,
        "Value preview:",
        token?.substring(0, 20) + "..."
      ); // Log an toàn (không full token)
      if (!token) {
        console.warn("No token - Redirecting to login");
        alert("Please login first!");
        navigate("/");
        return;
      }
      // Optional: Verify token không expired (dùng jwt-decode nếu cần)
      // import jwtDecode from 'jwt-decode';
      // const decoded = jwtDecode(token);
      // if (decoded.exp * 1000 < Date.now()) { localStorage.removeItem('accessToken'); navigate('/login'); }
    };
    checkAuth();
  }, [navigate]);

  // --- Fetch logic với loading & error ---
  useEffect(() => {
    const fetchFriends = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/friends/list");
        setFriends(response.data.friends || []); // Fallback empty array
        const friendIds = new Set(
          response.data.friends?.map((f) => f._id) || []
        ); // Dùng _id (Mongoose ObjectId)
        setMyFriendIds(friendIds);
      } catch (error) {
        console.error("Friends fetch error:", error); // Log chi tiết
        setError("Failed to load friends. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();

    // --- Socket safe: Check socket tồn tại ---
    if (socket) {
      const handleFriendRequest = (data) => {
        setFriends((prev) => [data.sender, ...prev]);
        setMyFriendIds((prevIds) => new Set([...prevIds, data.sender._id]));
      };
      socket.on("friendRequest", handleFriendRequest);

      return () => {
        if (socket) socket.off("friendRequest", handleFriendRequest);
      };
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim() === "") {
      // Reload friends nếu empty
      window.location.reload(); // Simple, hoặc refetch
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(
        `/users/search?query=${encodeURIComponent(searchQuery)}`
      ); // Encode query
      setFriends(response.data.users || []);
      // myFriendIds giữ nguyên để check "Add" vs "Chat"
    } catch (error) {
      console.error("Search error:", error);
      setError("Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (userId) => {
    try {
      await api.post("/friends/request", { receiverId: userId });
      alert("Request sent!"); // Sau này dùng toast
      // Update UI: Remove from list hoặc disable button (optional)
    } catch (error) {
      console.error("Request error:", error);
      alert(
        "Request failed: " + (error.response?.data?.message || "Unknown error")
      );
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Band M Friends</h1>
        <p style={{ textAlign: "center", color: "#888" }}>
          Loading friends...
        </p>{" "}
        {/* Fallback inline nếu CSS chưa */}
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Band M Friends</h1>

      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search user by name or username"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          disabled={loading}
        />
        <button type="submit" className="search-button" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <ul className="friend-list">
        {friends.length === 0 ? (
          <li className="empty-state">
            <p>No friends or users found. Start by searching or adding some!</p>
          </li>
        ) : (
          friends.map((friend) => (
            <li key={friend._id || friend.id} className="friend-item">
              {" "}
              {/* _id cho Mongoose */}
              <div className="friend-info">
                <img
                  src={friend.avatar || "/default-avatar.png"}
                  alt="Avatar"
                  className="friend-avatar"
                />{" "}
                {/* Thêm avatar nếu có */}
                <div>
                  <span className="friend-name">{friend.fullName}</span>
                  <span className="friend-username">@{friend.username}</span>
                  {friend.onlineStatus && (
                    <span className="online-status">● Online</span>
                  )}
                </div>
              </div>
              <div className="friend-actions">
                {myFriendIds.has(friend._id || friend.id) ? (
                  <Link
                    to={`/chat/${friend._id || friend.id}`}
                    className="button button-chat"
                  >
                    Chat
                  </Link>
                ) : (
                  <button
                    onClick={() => sendRequest(friend._id || friend.id)}
                    className="button button-add"
                    disabled={loading}
                  >
                    Add Friend
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default Friends;
