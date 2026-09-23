/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [tailwindcss(), react()],
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
          // beui 官方组件依赖 motion（含 framer-motion 内核，layoutId 还会拉进 layout
          // projection）。独立分块是为了多个懒加载页共用一份、且体积可单独盯住
          // （预算条目见 .size-limit.json）。
          // ⚠ 这个分块只在"motion 仅被懒加载页引用"时才挡住关键路径：任何被入口
          // 静态引用的组件（如曾经的 AppShell → Onboarding → Field）都会让入口
          // 直接 import 这个 chunk，首屏就要多下 46 kB gz。改完 Field 记得回头看
          // index-*.js 的体积（基线 90.45 kB gz，超了先查谁把 motion 拉进了静态图）。
          'vendor-motion': ['motion', 'motion/react', 'framer-motion'],
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
