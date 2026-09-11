/**
 * Phase 6 PR-2 · ESLint flat config（ESLint 9 标配）。
 * ─────────────────────────────────────────────────
 * 目标：8 态矩阵 + 语义 HTML + a11y 在 CI 必跑；零 warning。
 * 规则集：typescript-eslint 严格档 + jsx-a11y recommended + react/hooks 推荐。
 *
 * 跑法：`npm run lint`（CI 必跑，--max-warnings 0）。
 *
 * 关键：flat config 不支持 `extends`，所以所有 config 都直接展开。
 * `tseslint.configs.recommendedTypeChecked` 必须限定到有 tsconfig 的目录。
 */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  // 1) 忽略 dist / node_modules / .workbuddy / .agents / 旧 legacy / 旧 .mjs 测试
  {
    ignores: [
      'dist/**',
      'dev-dist/**',
      'node_modules/**',
      '.workbuddy/**',
      '.deploy/**',
      '.playwright-cli/**',
      '.pw-profile/**',
      '.agents/**',
      '.coverage/**',
      'coverage/**',
      // Phase 6 PR-8 删；之前不进 lint
      'tests/*.test.mjs',
      'tests/check-no-legacy-refs-fixture/**',
      'tests/visual/baseline/**',
      'tests/visual/diff/**',
      'src.legacy/**',
      'legacy.html',
    ],
  },

  // 2) JS 推荐集（全局兜底，不依赖 TS）
  js.configs.recommended,

  // 3) TS 严格集（仅 src/，依赖 tsconfig.json 提供类型信息）
  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ['src/**/*.{ts,tsx}'],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((c) => ({
    ...c,
    files: ['src/**/*.{ts,tsx}'],
  })),

  // 4) 业务文件（src/）统一规则
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      // React 17+ 不强制 import React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      // a11y 补强：icon-only 按钮强制 aria-label
      'jsx-a11y/control-has-associated-label': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      // TS 严格
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // 其它
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },

  // 4b) dev 演示页（StylePage）：纯 token 演示，允许空箭头/不严格
  {
    files: ['src/dev/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
      'no-empty': 'off',
    },
  },

  // 4c) 兼容性补丁：empty event handler stubs（addEventListener('focus', () => {})）
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions', 'methods', 'functions'] }],
    },
  },

  // 5) Functions 文件（Pages Function，单独的 Node 环境，不开 type-aware）
  {
    files: ['functions/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        fetch: 'readonly', Response: 'readonly', Request: 'readonly',
        URL: 'readonly', URLSearchParams: 'readonly', ReadableStream: 'readonly',
        console: 'readonly', crypto: 'readonly',
        atob: 'readonly', btoa: 'readonly',
        TextEncoder: 'readonly', TextDecoder: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        process: 'readonly', Buffer: 'readonly', globalThis: 'readonly',
      },
    },
    rules: {
      // Pages Function 不走 type-aware
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/await-thenable': 'off',
      'no-console': 'off',
    },
  },

  // 6) 配置/脚本/测试（独立环境）
  {
    files: ['scripts/**/*.{js,mjs,cjs}', '*.config.{js,mjs,ts}', 'tests/**/*.{ts,tsx,mjs}'],
    languageOptions: {
      parserOptions: {
        project: false,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly', process: 'readonly', fetch: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        URL: 'readonly', Buffer: 'readonly', globalThis: 'readonly',
        window: 'readonly', document: 'readonly',
        localStorage: 'readonly', sessionStorage: 'readonly', navigator: 'readonly',
        HTMLElement: 'readonly', Element: 'readonly',
        Event: 'readonly', MouseEvent: 'readonly', PointerEvent: 'readonly', KeyboardEvent: 'readonly',
        indexedDB: 'readonly',
        // 浏览器 DOM 调试常用
        getComputedStyle: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-empty': 'off',
    },
  },
]
