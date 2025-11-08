import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // Cho production build (serve từ root)
  build: {
    outDir: "dist", // Vite default output là 'dist/' (không phải 'build' như CRA)
    sourcemap: true, // Debug dễ hơn
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:5000", // Proxy API calls đến backend dev
    },
  },
});
