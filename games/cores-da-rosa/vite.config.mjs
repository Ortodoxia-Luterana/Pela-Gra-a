import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/assets/cores-da-rosa/',
  publicDir: 'public',
  build: {
    outDir: fileURLToPath(new URL('../../public/cores-da-rosa', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022'
  }
});
