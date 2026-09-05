import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

process.env.TZ = "Asia/Ho_Chi_Minh";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    include: ["features/project/**/*.test.{ts,tsx}"],
    clearMocks: true,
  },
});
