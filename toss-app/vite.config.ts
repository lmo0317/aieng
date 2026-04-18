import { defineConfig } from 'vite';
import { resolve } from 'path';

const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://aieng.duckdns.org'
  : '';

export default defineConfig({
  root: resolve(__dirname, '../public'),
  publicDir: false,
  plugins: [
    {
      name: 'copy-js-files',
      writeBundle() {
        const fs = require('fs');
        const path = require('path');
        const src = resolve(__dirname, '../public/js');
        const dest = resolve(__dirname, 'dist/web/js');
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((file: string) => {
          fs.copyFileSync(path.join(src, file), path.join(dest, file));
        });
      },
    },
    {
      name: 'inject-api-base',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>\n<script>window.API_BASE = "${API_BASE}";</script>`
        );
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, '../public/index.html'),
        tech: resolve(__dirname, '../public/tech.html'),
        enter: resolve(__dirname, '../public/enter.html'),
        songs: resolve(__dirname, '../public/songs.html'),
        puzzle: resolve(__dirname, '../public/puzzle.html'),
        punchline: resolve(__dirname, '../public/punchline.html'),
        learn: resolve(__dirname, '../public/learn.html'),
        'puzzle-play': resolve(__dirname, '../public/puzzle-play.html'),
        review: resolve(__dirname, '../public/review.html'),
        topic: resolve(__dirname, '../public/topic.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:80',
      '/ws': {
        target: 'ws://localhost:80',
        ws: true,
      },
    },
  },
});
