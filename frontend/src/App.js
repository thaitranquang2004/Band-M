import React, { useEffect, useState } from "react"; // Thêm useEffect, useState
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useNavigate, // Thêm useNavigate cho redirect
  useLocation,
} from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // npm install jwt-decode nếu chưa (cho expiry check)
import Login from "./pages/Login";
import Register from "./pages/Register";
import Friends from "./pages/Friends";
import Chats from "./pages/Chats";
import ChatWindow from "./pages/ChatWindow";
import Profile from "./pages/Profile";

// Protected Route (check accessToken & expiry)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("accessToken"); // Thống nhất key với Login.js
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true }); // Không token → login
      return;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        // Token expire
        localStorage.clear(); // Clear token & user
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Invalid token in ProtectedRoute:", err);
      localStorage.clear();
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  if (!token) return <Navigate to="/" replace />; // Block nếu không token
  return children; // OK → render
};

// MainLayout: Chứa Navbar + Routes + Auto-redirect logic
const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false); // State đơn giản cho Navbar/Logout

  // Auto-check auth khi app load (fix persist sau refresh)
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setIsAuthenticated(true);
          console.log("Auto-auth success in MainLayout"); // Debug
          // Join Socket room cho online status (theo Band M flow)
          if (window.socket) {
            // Giả sử socket.js expose window.socket
            window.socket.emit("joinUser", decoded.id || decoded.userId);
          }
          // Nếu đang ở "/" nhưng đã auth → redirect /friends
          if (location.pathname === "/") {
            navigate("/friends", { replace: true });
          }
        } else {
          localStorage.clear();
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Invalid token on load:", err);
        localStorage.clear();
        setIsAuthenticated(false);
      }
    }
  }, [location.pathname, navigate]); // Re-run nếu path thay đổi

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    if (window.socket) {
      window.socket.emit("leaveUser");
    }
    navigate("/", { replace: true }); // Về login
  };

  // Ẩn Navbar ở login/register
  const hideNavbarOnPaths = ["/", "/register"];
  const shouldHideNavbar = hideNavbarOnPaths.includes(location.pathname);

  return (
    <div className="app">
      {/* Navbar chỉ hiện nếu authenticated & không phải public path */}
      {isAuthenticated && !shouldHideNavbar && (
        <nav style={{ padding: "10px", background: "#333", color: "white" }}>
          <Link to="/friends" style={{ color: "white", marginRight: "20px" }}>
            Friends
          </Link>
          <Link to="/chats" style={{ color: "white", marginRight: "20px" }}>
            Chats
          </Link>
          <Link to="/profile" style={{ color: "white", marginRight: "20px" }}>
            Profile
          </Link>
          <button
            onClick={handleLogout}
            style={{ color: "white", background: "none", border: "none" }}
          >
            Logout
          </button>
        </nav>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chats"
          element={
            <ProtectedRoute>
              <Chats />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:chatId"
          element={
            <ProtectedRoute>
              <ChatWindow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

// App: Chỉ bọc Router
function App() {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
}

export default App;
