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
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // vendor 分包：框架/查询/大依赖独立缓存层，业务代码改动不再打爆整包
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query', 'zustand'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // 只跑新 React 应用的测试；legacy tests/*.test.mjs 由 node tests/*.test.mjs 独立运行（Phase 6 退役）
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
