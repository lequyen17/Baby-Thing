import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages phục vụ web ở /<tên repo>/, workflow deploy đặt VITE_BASE; Docker/local giữ gốc /
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: {
    port: 3000,
    // Chạy `npm run dev` ngoài Docker thì /api được proxy sang backend local
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
