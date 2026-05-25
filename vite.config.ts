import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:7171',
      '/events': {
        target: 'http://localhost:7171',
        ws: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, _req, res) => {
            const closeDown = () => { if (!res.writableEnded) res.end(); };
            proxyRes.on('close', closeDown);
            proxyRes.on('end', closeDown);
          });
          proxy.on('error', (_err, _req, res) => {
            const r = res as { writableEnded?: boolean; end?: () => void };
            if (!r.writableEnded && r.end) r.end();
          });
        },
      },
    },
  },
});
