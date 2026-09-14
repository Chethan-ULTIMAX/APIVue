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
    host: '::',
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [react()],

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
