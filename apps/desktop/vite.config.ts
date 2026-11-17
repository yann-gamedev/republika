import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Mode e2e (hanya untuk Playwright): kampanye 20 kuartal tanpa bergantung pada scenario.json.
  ...(mode === 'e2e'
    ? { define: { 'import.meta.env.VITE_MAX_TURNS_OVERRIDE': JSON.stringify('20') } }
    : {}),
  clearScreen: false,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  build: {
    target: 'chrome105',
    minify: 'esbuild',
    sourcemap: false,
  },
}));
