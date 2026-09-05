import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    define: {
      '__dirname': '""',
      'global': 'globalThis',
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'next/navigation': path.resolve(__dirname, 'lib/shims/next-navigation.tsx'),
        'next/link': path.resolve(__dirname, 'lib/shims/next-link.tsx'),
        'next/router': path.resolve(__dirname, 'lib/shims/next-navigation.tsx'),
        'next/cache': path.resolve(__dirname, 'lib/shims/next-cache.ts'),
        'next/server': path.resolve(__dirname, 'lib/shims/next-server.ts'),
        'next/headers': path.resolve(__dirname, 'lib/shims/next-headers.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
