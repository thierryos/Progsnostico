
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Altere 'nome-do-repositorio' para o nome exato do seu repo no GitHub
  // Exemplo: se o repo for https://github.com/usuario/meu-jogo, use base: '/meu-jogo/'
  base: '/nome-do-repositorio/', 
})
