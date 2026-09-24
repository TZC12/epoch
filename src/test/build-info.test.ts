import { afterEach, describe, expect, it } from 'vitest'
import { readBuildInfo, formatBuildTime, buildInfoLine } from '@/lib/build-info'

/**
 * 「我的 → 关于」的数据源。这里最要紧的是第一条：dev 下三枚 meta 根本不存在，
 * 必须返回 null 让整条 UI 消失——显示一个假的或 "dev" 的版本号，比不显示更糟。
 */

const put = (name: string, content: string): void => {
  const m = document.createElement('meta')
  m.setAttribute('name', name)
  m.setAttribute('content', content)
  document.head.appendChild(m)
}
const clear = (): void => {
  document.querySelectorAll('meta[name^="app-"]').forEach((m) => m.remove())
}
afterEach(clear)

describe('readBuildInfo', () => {
  it('没有任何 app-* meta（dev server）→ null', () => {
    expect(readBuildInfo()).toBeNull()
  })

  it('只有 commit 时也成立：env 退回占位、builtAt 为空串', () => {
    put('app-version', '462557f0c894b973774126a31129c3a5776fa235')
    const b = readBuildInfo()!
    expect(b.short).toBe('462557f')
    expect(b.builtAt).toBe('')
    expect(b.env).toBe('—')
  })

  it('三枚齐全时逐项映射（短 SHA 取前 7 位）', () => {
    put('app-version', '  abcdef1234567890  ')
    put('app-built', '2026-09-23T12:23:51.126Z')
    put('app-env', 'production')
    expect(readBuildInfo()).toEqual({
      commit: 'abcdef1234567890', short: 'abcdef1', builtAt: '2026-09-23T12:23:51.126Z', env: 'production',
    })
  })
})

describe('formatBuildTime / buildInfoLine', () => {
  it('空值与非法值都不变成 Invalid Date', () => {
    expect(formatBuildTime('')).toBe('—')
    expect(formatBuildTime('not-a-date')).toBe('not-a-date')
  })

  it('合法 ISO 会本地化成可读时间', () => {
    const s = formatBuildTime('2026-01-02T03:04:05.000Z')
    expect(s).not.toBe('2026-01-02T03:04:05.000Z')
    expect(s).toContain('2026')
  })

  it('复制行带全排查需要的三项', () => {
    put('app-version', '462557f0c894b97')
    put('app-built', '2026-09-23T12:23:51.126Z')
    put('app-env', 'production')
    const line = buildInfoLine(readBuildInfo()!)
    expect(line).toContain('462557f0c894b97')
    expect(line).toContain('production')
    expect(line).toContain('2026-09-23T12:23:51.126Z')
  })
})
