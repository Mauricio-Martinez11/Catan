import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "react-native": "react-native-web" } },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/ws": { target: "ws://127.0.0.1:3001", ws: true },
      "/api": "http://127.0.0.1:3001",
    },
  },
});
