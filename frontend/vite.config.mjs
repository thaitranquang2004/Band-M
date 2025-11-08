import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // Relative cho Render serve static
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:5000", // Proxy auth/chats/messages đến backend
    },
  },
  optimizeDeps: {
    include: ["socket.io-client"], // Optimize cho real-time (Vite 4.x cần explicit)
  },
});
