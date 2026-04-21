import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  envDir: path.resolve(__dirname, '..'),
  // Vitest bundles a different Vite than the app; plugins stay runtime-correct.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- cross-version Plugin types between vite and vitest
  plugins: [react(), tailwindcss()] as any,
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
    },
  },
})
