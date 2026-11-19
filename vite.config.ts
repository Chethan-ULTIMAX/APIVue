import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

/**
 * APIVue uses the repository sub-path on GitHub Pages and the root path on
 * Vercel/other hosts. React Router derives its basename from this value.
 */
export default defineConfig(({ command }) => ({
  base: command === 'build' && !process.env.VERCEL ? '/APIVue/' : '/',

  server: {
    host: '0.0.0.0',
    port: 8080,
    // Sandbox previews are served from a per-session *.e2b.app host. Vite's
    // host allow-list blocks unknown hosts by default, which breaks the
    // preview; allow any host in this local/dev sandbox.
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    // Local mock API for manual and automated request-builder checks. Keeping
    // it behind the dev server proxy means test traffic stays same-origin.
    proxy: {
      '/mock-api': {
        target: 'http://127.0.0.1:8788',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/mock-api/, ''),
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: true,
  },

  plugins: [react()],

  build: {
    // The app shell, landing page and analytics screens should not all be
    // downloaded before the user does anything. Heavy vendor libraries get
    // their own long-lived chunks; feature areas load on demand.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('decimal.js'))
            return 'vendor-charts';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react';
          return undefined;
        },
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      '@tanstack/react-query',
      '@tanstack/query-core',
    ],
  },
}));
