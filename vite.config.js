import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

const sentryUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN
  && process.env.SENTRY_ORG
  && process.env.SENTRY_PROJECT
  && process.env.SENTRY_RELEASE,
)

export default defineConfig({
  plugins: [
    react(),
    sentryUploadEnabled && sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      telemetry: false,
      release: { name: process.env.SENTRY_RELEASE },
      sourcemaps: {
        assets: './dist/**',
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
    }),
  ].filter(Boolean),
  base: './',
  build: {
    sourcemap: sentryUploadEnabled ? 'hidden' : false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@sentry')) return 'monitoring'
          if (id.includes('@zxing')) return 'scanner'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('react')) return 'react'
          return 'vendor'
        },
      },
    },
  },
})
