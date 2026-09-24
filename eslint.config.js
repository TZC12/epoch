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
      // 界面原型截图/拼装脚本：一次性 Node 工具，不是 app 源码，不进 lint
      'spark-output/**',
      // Phase 6 PR-8 删；之前不进 lint
      'tests/*.test.mjs',
      'tests/check-no-legacy-refs-fixture/**',
      'tests/visual/baseline/**',
      'tests/visual/diff/**',
      'src.legacy/**',
      'legacy.html',
      // outputs/ 是技能产物的输出目录（.intent-compiler-test 等生成物），非项目源码
      'outputs/**',
      // public/sw.js 是手写 Service Worker，全局（self/caches/fetch）需在 SW 环境特化；
      // 结构与版本号由 src/test/pwa.test.ts 文件级断言把关，免重 lint 噪音。
      'public/sw.js',
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
      // prefer-nullish-coalescing：本项目大量 `||` 是**刻意的 falsy 兜底**，改成 ?? 会出 bug：
      //   - Button `disabled || loading` → `false ?? true` = false（该禁用时不禁用）
      //   - supabase env `A || B || ''` → 空串不再回退到备用变量，配置直接失效
      //   - GoalPanel `goal.focus || goal.next`：空串应视为"没有 focus"
      //   - SegmentedPager `clientWidth || 1`：0 是"未布局"，要兜底成 1 防除零
      // 用 ignorePrimitives 让规则只管"可空对象"场景，不再误伤原始类型的 falsy 语义。
      '@typescript-eslint/prefer-nullish-coalescing': ['error', {
        ignoreTernaryTests: true,
        ignoreMixedLogicalExpressions: true,
        ignorePrimitives: { bigint: true, boolean: true, number: true, string: true },
      }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      // 其它
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },

  // 4a) 测试文件：DOM 查询天然需要 cast（querySelector 返回 Element，
  //     取 .style/.value 必须断言成 HTMLElement/HTMLInputElement）。
  //     no-unnecessary-type-assertion 在测试目录会与 tsc 冲突——它判定"冗余"，
  //     tsc 却报 "Property 'style' does not exist on type 'Element'"。以 tsc 为准。
  {
    files: ['src/test/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // 4a′) 官方动效组件源码（@beui registry 逐字落地）。
  //     这里的规则冲突全是「风格」而非「正确性」：官方用 `type X = {}` 而不是 interface、
  //     用 `Array<T>` 而不是 `T[]`、有空接口继承、有冗余断言。为了让 `npx shadcn add` 的
  //     上游源码能与 registry 原文逐行 diff（升级时对得上），本目录关掉这几条风格规则；
  //     类型安全类规则（no-any / no-floating-promises / a11y / unused）照常生效。
  //     我们的改动一律以「【本地改动】」注释标记，见 src/components/motion/*.tsx。
  {
    files: ['src/components/motion/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
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
    // 用 TS 版 no-unused-vars 需在此 config 对象里显式挂插件（flat config 不继承）
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      // 同 section 6：不挂 tsconfig，但解析器必须是 TS，否则 `import type` / 类型注解报 parsing error
      parser: tseslint.parser,
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
      // 基础 no-unused-vars 不理解 TS 类型签名（会误报接口方法里的参数名，
      // 如 `complete: (prompt: string) => ...`）；改用 TS 版本并放行参数名。
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
    },
  },

  // 6) 配置/脚本/测试（独立环境；解析器切到 TS 让 `import { type X }` 这类语法合法）
  {
    files: ['scripts/**/*.{js,mjs,cjs}', '*.config.{js,mjs,ts}', 'tests/**/*.{ts,tsx,mjs}'],
    languageOptions: {
      parser: tseslint.parser,
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
