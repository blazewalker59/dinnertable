import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import viteReact from '@vitejs/plugin-react'

// Separate from vite.config.ts on purpose: the Cloudflare plugin there rejects
// vitest's ssr `resolve.external` and crashes the runner on startup. Tests
// render components in jsdom and don't need the Worker runtime.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'cloudflare:workers': fileURLToPath(
        new URL('./src/__tests__/_setup/cloudflare-workers.ts', import.meta.url),
      ),
    },
  },
  plugins: [viteReact()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
