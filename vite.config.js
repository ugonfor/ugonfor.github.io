import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/playground/main.js'),
      name: 'PlaygroundWorld',
      fileName: () => 'playground-world.js',
      formats: ['iife'],
    },
    outDir: resolve(__dirname, 'assets/js'),
    emptyOutDir: false,
    minify: false,
    rollupOptions: {
      output: {
        // 기존 IIFE와 동일하게 전역 스코프 오염 없음
        inlineDynamicImports: true,
      },
    },
  },
});
