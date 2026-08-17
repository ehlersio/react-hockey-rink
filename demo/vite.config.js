import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const demoDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: demoDir,
  plugins: [react()],
  server: { port: 5183 },
});
