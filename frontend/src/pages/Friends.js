import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useSocket } from "../context/SocketContext";
import "./Friends.css";

const Friends = ({ onSelectChat }) => {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [myFriendIds, setMyFriendIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { socket, onlineUsers } = useSocket();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        navigate("/");
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchFriends = async () => {
    setLoading(true);
    setError("");
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get("/friends/list"),
        api.get("/friends/requests/incoming"),
      ]);

      setFriends(friendsRes.data.friends || []);
      setIncomingRequests(requestsRes.data.requests || []);

      const friendIds = new Set(
        friendsRes.data.friends?.map((f) => f._id) || []
      );
      setMyFriendIds(friendIds);
    } catch (error) {
      console.error("Friends fetch error:", error);
      setError("Failed to load friends.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();

    if (socket) {
      const handleFriendRequest = (data) => {
        console.log("New friend request", data);
        // Refresh lists when a new request comes in
        fetchFriends();
      };

      const handleFriendAccepted = (data) => {
        console.log("Friend request accepted", data);
        fetchFriends();
      };

      socket.on("friendRequest", handleFriendRequest);
      socket.on("friendAccepted", handleFriendAccepted);

      return () => {
        socket.off("friendRequest", handleFriendRequest);
        socket.off("friendAccepted", handleFriendAccepted);
      };
    }
  }, [socket]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim() === "") {
      fetchFriends();
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(
        `/users/search?query=${encodeURIComponent(searchQuery)}`
      );

      setFriends(response.data.users || []);
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
      alert("Friend request sent!");
    } catch (error) {
      console.error("Request error:", error);
      alert(
        "Request failed: " + (error.response?.data?.message || "Unknown error")
      );
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      await api.put(`/friends/request/${requestId}/accept`);
      fetchFriends(); // Refresh lists
    } catch (error) {
      console.error("Accept error:", error);
      alert("Failed to accept request");
    }
  };

  const declineRequest = async (requestId) => {
    try {
      await api.put(`/friends/request/${requestId}/decline`);
      fetchFriends(); // Refresh lists
    } catch (error) {
      console.error("Decline error:", error);
      alert("Failed to decline request");
    }
  };

  const handleMessage = async (friendId) => {
    try {
      // Create or get existing chat
      const response = await api.post("/chats/create", {
        type: "direct",
        participants: [friendId],
      });
      onSelectChat(response.data.chatId);
    } catch (error) {
      console.error("Failed to start chat:", error);
      alert("Failed to start chat");
    }
  };

  if (loading && friends.length === 0 && incomingRequests.length === 0) {
    return (
      <div className="page-container loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page-container friends-page">
      <div className="friends-header">
        <h1 className="page-title">Friends</h1>
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Find friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            disabled={loading}
          />
          <button type="submit" className="search-button" disabled={loading}>
            <i className="fas fa-search"></i>
          </button>
        </form>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Incoming Requests Section */}
      {incomingRequests.length > 0 && !searchQuery && (
        <div className="requests-section">
          <h2 className="section-title">
            Friend Requests ({incomingRequests.length})
          </h2>
          <div className="friends-grid">
            {incomingRequests.map((req) => (
              <div key={req._id} className="friend-card request-card">
                <div className="friend-card-header">
                  <div className="friend-avatar-large">
                    {req.sender?.avatar ? (
                      <img src={req.sender.avatar} alt={req.sender.fullName} />
                    ) : (
                      <span>{req.sender?.username?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                </div>
                <div className="friend-card-body">
                  <h3 className="friend-name">{req.sender?.fullName}</h3>
                  <p className="friend-username">@{req.sender?.username}</p>
                </div>
                <div className="friend-card-actions">
                  <button
                    onClick={() => acceptRequest(req._id)}
                    className="button button-primary button-half"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => declineRequest(req._id)}
                    className="button button-secondary button-half"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
          <hr className="section-divider" />
        </div>
      )}

      {/* Friends List / Search Results */}
      <div className="friends-list-section">
        <h2 className="section-title">
          {searchQuery ? "Search Results" : `My Friends (${friends.length})`}
        </h2>
        <div className="friends-grid">
          {friends.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👋</div>
              <h3>{searchQuery ? "No users found" : "No friends yet"}</h3>
              <p>
                {searchQuery
                  ? "Try a different search term"
                  : "Search for people to add!"}
              </p>
            </div>
          ) : (
            friends.map((friend) => {
              const isOnline =
                onlineUsers.includes(friend._id || friend.id) ||
                friend.onlineStatus;
              return (
                <div key={friend._id || friend.id} className="friend-card">
                  <div className="friend-card-header">
                    <div className="friend-avatar-large">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.fullName} />
                      ) : (
                        <span>{friend.username?.[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    {isOnline && <span className="online-badge"></span>}
                  </div>

                  <div className="friend-card-body">
                    <h3 className="friend-name">{friend.fullName}</h3>
                    <p className="friend-username">@{friend.username}</p>
                  </div>

                  <div className="friend-card-actions">
                    {myFriendIds.has(friend._id || friend.id) ? (
                      <button
                        onClick={() => handleMessage(friend._id || friend.id)}
                        className="button button-primary button-full"
                      >
                        Message
                      </button>
                    ) : (
                      <button
                        onClick={() => sendRequest(friend._id || friend.id)}
                        className="button button-secondary button-full"
                        disabled={loading}
                      >
                        Add Friend
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Friends;
