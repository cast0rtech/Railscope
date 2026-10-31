import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base relativa './' para empaquetado móvil APK (Capacitor/WebView) y compatible con web
  base: process.env.VITE_BASE || './',
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
});
