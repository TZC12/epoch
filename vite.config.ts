/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // 复用既有 .env 的 SUPABASE_URL / SUPABASE_ANON_KEY（anon key 为公开标识，RLS 才是安全边界）
  envPrefix: ['VITE_', 'SUPABASE_'],
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // 只跑新 React 应用的测试；legacy tests/*.test.mjs 由 node tests/*.test.mjs 独立运行（Phase 6 退役）
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
