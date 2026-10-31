import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configuración de base path para el despliegue en GitHub Pages (https://cast0rtech.github.io/Railscope/)
  base: '/Railscope/',
  server: {
    host: '127.0.0.1',
    port: 3000,
  },
});
