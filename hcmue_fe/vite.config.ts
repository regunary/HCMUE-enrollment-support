import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    /** Cùng cổng public với docker-compose (NGINX_PORT). `host` để reverse-proxy/nginx ngoài máy forward được. */
    port: 5032,
    strictPort: true,
    host: true,
  },
})
