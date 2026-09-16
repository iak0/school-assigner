import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use relative paths for GitHub Pages compatibility
// When deployed to GitHub Pages, assets load from /repo-name/ and base='./' makes them work
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    allowedHosts: [".trycloudflare.com", ".loca.lt", "iak0.duckdns.org"],
    host: true, // Listens on all local network interfaces (0.0.0.0)
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test-setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
