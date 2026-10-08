import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Server-side development setting; never exposed in the browser bundle.
const apiTarget = process.env.EDUNEX_API_PROXY_TARGET ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/ws": {
        target: apiTarget,
        ws: true,
        changeOrigin: true,
      },
      "/api": {
        target: apiTarget,
        changeOrigin: true,
        // Frozen aggregate endpoints can take several minutes on the demo history.
        timeout: 600000,
        proxyTimeout: 600000,
      },
    },
  },
  test: {
    include: ["src/test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    restoreMocks: true,
  },
});
