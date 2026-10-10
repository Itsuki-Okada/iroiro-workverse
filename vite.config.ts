import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

declare const process: { env: Record<string, string | undefined> };

// GitHub Pages（プロジェクトページ）では BASE_PATH=/リポジトリ名/ でビルドする
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
