import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '@/components/ui/EmptyState'

/** M0 基线冒烟：验证 vitest + RTL + setup polyfill 全链路。 */
describe('M0 工具链基线', () => {
  it('PointerEvent / matchMedia polyfill 生效', () => {
    expect(window.PointerEvent).toBeDefined()
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false)
  })

  it('RTL 渲染 + jest-dom 断言可用', () => {
    render(<EmptyState title="Nothing waiting." sub="sub" />)
    expect(screen.getByText('Nothing waiting.')).toBeInTheDocument()
    expect(screen.getByText('sub')).toHaveClass('empty__sub')
  })
})
