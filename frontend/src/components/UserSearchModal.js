import React, { useState } from 'react';
import api from '../utils/api';
import './UserSearchModal.css';

const UserSearchModal = ({ isOpen, onClose, onSelectUser, title = "Search Users", searchMode = "all" }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (searchMode === "friends") {
        const response = await api.get("/friends/list");
        const allFriends = response.data.friends;
        const filtered = allFriends.filter(f => 
          f.username.toLowerCase().includes(query.toLowerCase()) || 
          f.fullName.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } else {
        if (!query.trim()) {
            setLoading(false);
            return;
        }
        const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
        setResults(response.data.users);
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSearch} className="modal-search-form">
          <input
            type="text"
            placeholder="Search by name or username..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="modal-results">
          {results.length === 0 && query && !loading && (
            <p className="no-results">No users found.</p>
          )}
          
          {results.map(user => (
            <div key={user.id || user._id} className="modal-user-item" onClick={() => onSelectUser(user)}>
              <div className="user-avatar-placeholder">
                {user.username[0].toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-fullname">{user.fullName}</span>
                <span className="user-username">@{user.username}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserSearchModal;
