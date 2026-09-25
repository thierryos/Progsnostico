/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const fake = (file: string) => fileURLToPath(new URL(`./src/net/fake/${file}`, import.meta.url));

// `npm run dev:fake`: troca o Firebase por um banco em memória compartilhado entre abas.
const fakeFirebase: Record<string, string> = {
  'firebase/app': fake('app.ts'),
  'firebase/database': fake('database.ts'),
};

/**
 * GitHub Pages não conhece as rotas do app (/room/CODIGO, /lobby…): para qualquer caminho
 * desconhecido ele serve o 404.html. Copiando o index.html para lá, o app abre em qualquer rota.
 */
const spaFallback = (): Plugin => ({
  name: 'spa-404-fallback',
  apply: 'build',
  closeBundle() {
    const dist = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist');
    copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
  },
});

export default defineConfig(({ mode }) => ({
  // Caminho do repositório no GitHub Pages (https://thierryos.github.io/Progsnostico/)
  base: '/Progsnostico/',
  plugins: [react(), tailwindcss(), spaFallback()],
  resolve: {
    alias: mode === 'fakedb' ? fakeFirebase : {},
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Testes do emulador só rodam via `npm run test:emulator` (que define esta variável).
    exclude: process.env.FIREBASE_DATABASE_EMULATOR_HOST
      ? ['node_modules/**']
      : ['node_modules/**', 'src/**/*.emulator.test.ts'],
  },
}));
