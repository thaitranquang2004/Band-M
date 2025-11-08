import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const api = axios.create({
  baseURL: API_URL,
});

// Attach JWT header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
