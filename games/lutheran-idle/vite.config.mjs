import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/assets/lutheran-idle/',
  publicDir: 'public',
  build: {
    outDir: fileURLToPath(new URL('../../public/lutheran-idle', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022'
  }
});
