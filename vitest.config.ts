/// <reference types="vitest" />

import { defineConfig } from "vite";

export default defineConfig({
  clearScreen: false,
  test: {
    globals: true,
    environment: "jsdom",
  },
});
