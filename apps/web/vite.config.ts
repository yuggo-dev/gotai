import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "goTAI",
        short_name: "goTAI",
        description: "Comunidade, práticas e atividades do seu Dojotai.",
        theme_color: "#174b35",
        background_color: "#f7f6f0",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      devOptions: { enabled: true },
    }),
  ],
  server: {
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
});
