import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // <--- Thêm Link
import api from "../utils/api";
import "./Login.css";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    // ... (Phần logic submit giữ nguyên)
    e.preventDefault();
    try {
      const response = await api.post("/auth/login", { username, password });
      localStorage.setItem("accessToken", response.data.accessToken);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      navigate("/friends");
    } catch (error) {
      alert(
        "Login failed: " + (error.response?.data?.message || error.message)
      );
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
          />
        </div>

        <button type="submit" className="login-button">
          Login
        </button>

        {/* --- PHẦN CẬP NHẬT --- */}
        <div className="form-footer">
          {/* Bạn có thể dùng 'a' href nếu "Quên mật khẩu" là link ngoài
              Hoặc dùng <Link to="/forgot-password"> nếu là trang trong app
           */}
          <a href="/forgot-password" className="footer-link">
            Quên mật khẩu?
          </a>

          {/* Thêm phần đăng ký */}
          <span className="footer-text">
            Chưa có tài khoản?{" "}
            <Link to="/register" className="footer-link">
              Đăng ký ngay
            </Link>
          </span>
        </div>
        {/* --- KẾT THÚC CẬP NHẬT --- */}
      </form>
    </div>
  );
};

export default Login;
