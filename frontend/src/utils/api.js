import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      `API Request: ${config.method?.toUpperCase()} ${
        config.url
      } - Token attached: ${!!token}`
    );
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401
api.interceptors.response.use(
  (response) => {
    console.log(
      `API Success: ${response.config.method?.toUpperCase()} ${
        response.config.url
      }`
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log("Token expired - Attempting refresh...");

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: refreshToken
              ? { Authorization: `Bearer ${refreshToken}` }
              : {},
          }
        );

        // Update accessToken từ response
        if (refreshResponse.data.accessToken) {
          localStorage.setItem("accessToken", refreshResponse.data.accessToken);
          console.log("Refresh success - Retrying original request");

          // Update header & retry
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return api(originalRequest);
        } else {
          throw new Error("No new token from refresh");
        }
      } catch (refreshError) {
        console.error("Refresh failed:", refreshError);
        // Clear storage & redirect
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    // Các error khác (400, 500)
    return Promise.reject(error);
  }
);

export default api;
