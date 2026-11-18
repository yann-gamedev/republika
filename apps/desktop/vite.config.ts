import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, type PluginOption } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Mode analyze (pnpm perf:report): data ukuran per modul untuk laporan performa.
    ...(mode === 'analyze'
      ? [
          visualizer({
            filename: 'dist-stats/stats.json',
            template: 'raw-data',
            gzipSize: true,
          }) as PluginOption,
          visualizer({
            filename: 'dist-stats/stats.html',
            template: 'treemap',
            gzipSize: true,
          }) as PluginOption,
        ]
      : []),
  ],
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
