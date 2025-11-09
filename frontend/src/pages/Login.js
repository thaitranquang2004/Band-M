import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // State cho error display
  const [loading, setLoading] = useState(false); // Loading state cho button
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear error trước submit
    setLoading(true); // Disable button

    // Client-side validation (nhẹ, tránh API call thừa)
    if (!username.trim() || !password.trim()) {
      setError("Vui lòng nhập username và password.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/login", { username, password });

      // Debug: Log response để check (xóa sau khi test OK)
      console.log("Login Response Full:", response.data);
      console.log("Access Token Exists?", !!response.data.accessToken);
      console.log("Refresh Token Exists?", !!response.data.refreshToken);
      console.log("User Data:", response.data.user);

      // Lưu accessToken & user (giữ nguyên)
      localStorage.setItem("accessToken", response.data.accessToken);

      // Lưu refreshToken nếu backend return (theo API row3, cho /auth/refresh sau)
      if (response.data.refreshToken) {
        localStorage.setItem("refreshToken", response.data.refreshToken);
      }

      localStorage.setItem("user", JSON.stringify(response.data.user));

      // Debug: Verify localStorage sau lưu
      console.log("LocalStorage after login:", {
        accessToken:
          localStorage.getItem("accessToken")?.substring(0, 20) + "...",
        refreshToken: !!localStorage.getItem("refreshToken")
          ? "Saved"
          : "Not returned",
        user: JSON.parse(localStorage.getItem("user") || "{}"),
      });

      // Socket join cho online status (theo Band M flowchart: Set Session → Join Room)
      if (window.socket) {
        // Giả sử socket.js expose window.socket
        window.socket.emit("joinUser", response.data.user.id); // Emit user ID để backend set onlineStatus
        console.log("Socket joined user room:", response.data.user.id);
      }

      // Navigate sang /friends (App.js sẽ auto-check & pass ProtectedRoute)
      navigate("/friends", { replace: true }); // replace tránh back history
    } catch (error) {
      // Debug full error
      console.error("Login Error Full:", error);

      // Handle error theo backend (e.g., 401: Invalid credentials)
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Đăng nhập thất bại. Thử lại nhé!";
      setError(errorMsg);
    } finally {
      setLoading(false); // Re-enable button
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h1 className="login-title">Band M Login</h1>

        <div className="input-group">
          <input
            type="text"
            id="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="login-input"
            required
            disabled={loading} // Disable khi loading
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="login-input"
            required
            disabled={loading}
          />
        </div>

        {/* Error display thay alert (UX tốt hơn) */}
        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="login-button" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Login"}
        </button>

        <div className="form-footer">
          <a href="/forgot-password" className="footer-link">
            Quên mật khẩu?
          </a>

          <span className="footer-text">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="footer-link">
              Đăng ký ngay
            </Link>
          </span>
        </div>
      </form>
    </div>
  );
};

export default Login;
