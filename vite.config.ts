import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @solana/web3.js v1 is a Node-era library: it reaches for Buffer and for a
// `global` that browsers do not have. Rather than patch call sites, we hand it
// the two globals it expects and let the library be itself.
export default defineConfig({
  plugins: [react()],
  define: { global: "globalThis" },
  resolve: { alias: { buffer: "buffer/" } },
  optimizeDeps: { include: ["buffer"] },
});
