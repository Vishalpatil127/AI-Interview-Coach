import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom')) return 'vendor-react';
          if (id.includes('/react/') || id.includes('/react@') || id.includes('/scheduler/')) return 'vendor-react';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('/victory-')) return 'vendor-recharts';
          if (id.includes('framer-motion')) return 'vendor-motion';
          return 'vendor';
        },
      },
    },
  },
});
