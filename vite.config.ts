import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api is proxied to the Express backend (port 4000) once it exists.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:4000" } },
});
