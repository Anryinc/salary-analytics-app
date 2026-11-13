/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

const commit = (process.env.GITHUB_SHA || 'dev').slice(0, 7)

export default defineConfig({
  plugins: [react()],
  base: '/salary-analytics-app/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(commit),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
