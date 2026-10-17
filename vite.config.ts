import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';

// Telegram opens the Mini App over HTTPS at WEBAPP_URL; `base` stays relative so
// the build works from any path (GitHub Pages, Railway static, a sub-folder).
// Shown on the sign-in screen so support can tell which build a browser runs (Vercel sets the sha).
const build = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'dev').slice(0, 7);

export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(build) },
  base: './',
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    sourcemap: false,
    // Two pages: the student's Mini App (index.html) and the owner's dashboard (admin.html).
    rollupOptions: { input: { app: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html') } },
  },
});
