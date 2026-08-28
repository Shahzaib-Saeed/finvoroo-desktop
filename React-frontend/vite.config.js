import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { buildVersionPlugin } from './vite-plugins/build-version.js';

export default defineConfig({
  plugins: [react(), tailwindcss(), buildVersionPlugin()],
  base: process.env.VITE_BASE_URL || '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    outDir: process.env.VITE_OUT_DIR || 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('apexcharts') || id.includes('react-apexcharts')) return 'vendor-charts-apex';
          if (id.includes('recharts')) return 'vendor-charts-recharts';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('@radix-ui') || id.includes('radix-ui')) return 'vendor-radix';
          if (id.includes('date-fns')) return 'vendor-date';
        },
      },
    },
  },
});
