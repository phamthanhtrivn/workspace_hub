import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

process.env.TZ = "Asia/Ho_Chi_Minh";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "jsdom",
    include: ["features/project/**/*.test.{ts,tsx}"],
    setupFiles: ["features/project/test-setup.ts"],
    clearMocks: true,
  },
});
