import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    fs: {
      allow: ["/Users/suhyun/.codex-jsx-preview"]
    }
  }
});
