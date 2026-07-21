import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/assets/crowns-and-councils/',
  publicDir: 'public',
  plugins: [preact()],
  build: {
    outDir: fileURLToPath(new URL('../../public/crowns-and-councils', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022'
  }
});
