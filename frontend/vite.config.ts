import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { copyFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// GitHub Pages sirve en /<repo-name>/ si no es user.github.io
// Se sobrescribe con VITE_BASE_URL en el workflow si es necesario
const base = (process.env.VITE_BASE_URL as string | undefined) || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  envDir: path.resolve(__dirname, '..'),
  plugins: [
    react(),
    tailwindcss(),
    // SPA fallback para GitHub Pages: copia index.html como 404.html
    {
      name: 'spa-fallback-404',
      closeBundle() {
        const dist = path.resolve(__dirname, 'dist')
        const index = path.join(dist, 'index.html')
        const notFound = path.join(dist, '404.html')
        try {
          copyFileSync(index, notFound)
        } catch {
          // Si no existe index.html (ej. SSR futuro), no hace nada
        }
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as any,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
    },
  },
})
