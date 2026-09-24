/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import { fileURLToPath, URL } from 'node:url'

/**
 * 构建版本锚点：往 HTML 注入 <meta name="app-version">，并产出 /version.json。
 * ────────────────────────────────────────────────────────────────
 * 为什么需要：上线链路是「本地 commit → GitHub API 推 main → Pages 自动构建」，
 * 我们看不到 Pages 的构建日志，也没有 python 跑 .deploy/verify_deploy.py。
 * 没有可比对的生产侧标记，"部署成功了"就只能靠肉眼刷新。
 * 现在 `npm run verify:deploy` 轮询 /version.json，等到 commit == 远端 main 顶端即判 PASS。
 * 同一份信息以三枚 meta 形式进 HTML（app-version / app-built / app-env），运行时由
 * src/lib/build-info.ts 读取，「我的 → 关于」里能直接看到并报出来——用户口头描述
 * "我这边显示不对"时，第一件要问的就是线上是哪个 commit。
 * commit 优先取 Pages 注入的 CF_PAGES_COMMIT_SHA（远端 SHA 与本地 SHA 本就不等，见
 * gh-api-push.mjs 的 squash 设计）；本地构建回落 git rev-parse，拿不到则 unknown（不让构建挂）。
 * version.json 不进 SW 预缓存（patch-sw 只收 /assets/*.js|css 与 4 个图标），所以永远是实时值。
 */
function appVersion(): Plugin {
  const sha = ((): string => {
    if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim() } catch { return 'unknown' }
  })()
  const branch = process.env.CF_PAGES_BRANCH ?? 'local'
  const info = {
    commit: sha,
    branch,
    environment: process.env.CF_PAGES ? (branch === 'main' ? 'production' : 'preview') : 'local',
    built_at: new Date().toISOString(),
  }
  return {
    name: 'epoch-app-version',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('</title>',
        `</title>\n    <meta name="app-version" content="${info.commit}" />`
        + `\n    <meta name="app-built" content="${info.built_at}" />`
        + `\n    <meta name="app-env" content="${info.environment}" />`),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(info, null, 2) })
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react(), appVersion()],
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
