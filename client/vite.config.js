import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const destino = process.env.API_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': destino,
      '/media': destino,
      '/login/google': destino,
      '/sitemap.xml': destino,
      '/robots.txt': destino,
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
