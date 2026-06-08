import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Прокси Grafana в dev: один origin с панелью, без CORS и без localhost→IPv6
      "/grafana-proxy": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        // Не срезаем префикс: Grafana настроена на subpath /grafana-proxy.
        rewrite: (path) => path,
      },
    },
  },
});
