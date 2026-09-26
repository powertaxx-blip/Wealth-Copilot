import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests for the app's pure calculation and safety logic (lib/).
// No browser or DOM: anything that touches window.localStorage is given
// a small in-memory stand-in inside its own test file.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
