// src/utils/api.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Cho refreshToken cookie nếu backend httpOnly (secure)
});

// Request interceptor: Attach accessToken từ localStorage (sync với Login.js)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Debug: Log cho test (xóa sau khi OK)
    console.log(
      `API Request: ${config.method?.toUpperCase()} ${
        config.url
      } - Token attached: ${!!token}`
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 (refresh token theo API row5)
api.interceptors.response.use(
  (response) => {
    // Debug: Log success (xóa sau)
    console.log(
      `API Success: ${response.config.method?.toUpperCase()} ${
        response.config.url
      }`
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Nếu 401 và chưa retry (tránh loop)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log("Token expired - Attempting refresh..."); // Debug

      try {
        // Gọi /auth/refresh (body empty, dùng refreshToken từ localStorage/cookie)
        const refreshToken = localStorage.getItem("refreshToken");
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true, // Gửi cookie nếu httpOnly
            headers: refreshToken
              ? { Authorization: `Bearer ${refreshToken}` }
              : {}, // Nếu lưu local
          }
        );

        // Update accessToken từ response (theo row5: { accessToken: newJWT })
        if (refreshResponse.data.accessToken) {
          localStorage.setItem("accessToken", refreshResponse.data.accessToken);
          console.log("Refresh success - Retrying original request"); // Debug

          // Update header & retry
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return api(originalRequest);
        } else {
          throw new Error("No new token from refresh");
        }
      } catch (refreshError) {
        console.error("Refresh failed:", refreshError);
        // Clear storage & redirect (sync với App.js logout)
        localStorage.clear();
        window.location.href = "/"; // Hard redirect về login
        return Promise.reject(refreshError);
      }
    }

    // Các error khác (400, 500) pass qua
    return Promise.reject(error);
  }
);

export default api;
