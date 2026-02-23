import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/PANELLON/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
});
