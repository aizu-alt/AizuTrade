import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            if (id.includes('@tanstack')) return 'vendor-tanstack';
            if (id.includes('lucide-react')) return 'vendor-icons';
            return 'vendor-common';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
