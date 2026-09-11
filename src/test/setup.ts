import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@/lib/i18n'   // 测试全局初始化 i18n（与 main.tsx 同源）

/* RTL：每个用例后卸载，避免重复节点串扰 */
afterEach(() => { cleanup() })

/* jsdom 缺 PointerEvent（行滑动手势 / RTL 事件依赖；与 legacy tests 同款 polyfill） */
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    pointerType: string
    isPrimary: boolean
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
      this.isPrimary = init.isPrimary ?? true
    }
  }
  Object.defineProperty(window, 'PointerEvent', {
    value: PointerEventPolyfill, writable: true, configurable: true,
  })
}

/* jsdom 无 matchMedia（theme.ts / reduced-motion 依赖） */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

/* jsdom 无 scrollTo / scrollIntoView（滚轮选择器/日历用） */
if (typeof window !== 'undefined' && typeof window.scrollTo !== 'function') {
  Object.defineProperty(window, 'scrollTo', { writable: true, configurable: true, value: () => {} })
}
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {}
}
