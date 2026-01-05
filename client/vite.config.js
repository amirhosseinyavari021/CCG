import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    proxy: {
      "/api": {
              target: "http://127.0.0.1:50000",
              changeOrigin: true,
            },
    },
  },
  plugins: [react()],
  root: '.',                // مسیر ریشه پروژه
  publicDir: 'public',      // پوشه public (اگر داری)
  build: {
    outDir: 'dist',         // جایی که خروجی میره
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    }
  },
});
