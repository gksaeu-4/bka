import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }, // 카메라는 localhost 또는 HTTPS에서만 동작합니다.
});
