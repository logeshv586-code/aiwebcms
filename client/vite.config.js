import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/sitemap.xml': { target: 'http://localhost:5000', rewrite: () => '/api/storefront/sitemap.xml' },
      '/robots.txt': { target: 'http://localhost:5000', rewrite: () => '/api/storefront/robots.txt' }
    }
  }
});
