import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    env: {
      APP_MODE: "fixture",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/**", ".next/**", "src/tests/**", "**/*.config.*", "scripts/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // In Next.js, `server-only` throws at bundle time if imported from a client
      // component. In vitest it's a no-op shim — tests run in node and can import
      // server-only modules freely.
      "server-only": path.resolve(__dirname, "./src/tests/shims/server-only.ts"),
    },
  },
});
