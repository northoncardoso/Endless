/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    // Ambiente Node mesmo para `src/render` e `src/ui`: só entram em teste as
    // funções puras, que não importam Pixi nem React. O que precisa de DOM ou de
    // canvas não entra no CI.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
