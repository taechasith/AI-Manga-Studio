import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.AIzaSyCdAi4lCc2V2Ak9Hi3xAaPLe5asUSb0L9U),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.AIzaSyCdAi4lCc2V2Ak9Hi3xAaPLe5asUSb0L9U)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
