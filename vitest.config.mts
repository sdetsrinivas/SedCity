import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": path.resolve(__dirname, "src"),
  "@traps": path.resolve(__dirname, "traps"),
};

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "traps/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "jsdom",
          include: ["tests/integration/**/*.test.tsx"],
          setupFiles: ["tests/integration/setup.ts"],
        },
      },
    ],
  },
});
