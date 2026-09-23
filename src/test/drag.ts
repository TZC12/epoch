import { act, fireEvent } from '@testing-library/react'

/**
 * 驱动 @beui/swipeable-list（motion drag）的共用测试工具。
 *
 * motion 的 pan 采样挂在它自己的 rAF 帧循环上（frame.update）：同一 tick 内连发
 * pointermove 只会被记成一个历史点 → 位移不生效、速度恒为 0。所以每个事件之间
 * 必须真的让出一帧；"位移 / 帧数"就是速度。
 *
 * ⚠ 别用 vi.useFakeTimers() 接管：motion-dom 在模块加载时就把 requestAnimationFrame
 *   存进了自己的 batcher（createRenderBatcher(requestAnimationFrame, true)），
 *   之后换成假定时器不会驱动它的帧循环，只会让手势停摆。
 */
const frame = (): Promise<unknown> =>
  new Promise((resolve) => { window.requestAnimationFrame(() => resolve(null)) })

const pbase = { pointerId: 1, isPrimary: true, pointerType: 'touch', clientY: 100, button: 0 }

export const press = (el: Element, x: number): Promise<unknown> =>
  act(async () => { fireEvent.pointerDown(el, { ...pbase, clientX: x, buttons: 0 }); await frame() })

export const moveTo = (el: Element, x: number, y = 100): Promise<unknown> =>
  act(async () => { fireEvent.pointerMove(el, { ...pbase, clientX: x, clientY: y, buttons: 1 }); await frame() })

export const lift = (el: Element, x: number): Promise<unknown> =>
  act(async () => { fireEvent.pointerUp(el, { ...pbase, clientX: x, buttons: 0 }); await frame() })

/** 浏览器抢走手势（iOS 纵滚 → pointercancel）的等价路径。 */
export const cancelPointer = (el: Element, x: number): Promise<unknown> =>
  act(async () => { fireEvent.pointerCancel(el, { ...pbase, clientX: x, buttons: 0 }); await frame() })

export async function swipe(
  el: Element,
  from: number,
  to: number,
  { frames = 12 }: { frames?: number } = {},
): Promise<void> {
  await press(el, from)
  for (let i = 1; i <= frames; i++) await moveTo(el, from + ((to - from) * i) / frames)
  await lift(el, to)
}

/** 结算弹簧（stiffness 560 / damping 48）跑完，位移才落到终点值上。 */
export const settle = (): Promise<unknown> => new Promise((r) => setTimeout(r, 700))

export const surface = (i = 0): HTMLElement =>
  [...document.querySelectorAll('.tl-row__inner')][i] as HTMLElement

/** 露出与否的可观察信号 = 官方给动作轨的 aria-hidden（未露出时整条轨 inert + 读屏不可达）。 */
export const revealed = (i = 0): boolean => {
  const rail = surface(i).parentElement!.querySelector('[aria-hidden]')
  return rail?.getAttribute('aria-hidden') === 'false'
}

/** motion 写进 inline style 的当前位移（px）。 */
export const xOf = (el: Element): number => {
  const m = /translateX\(([-\d.]+)px\)/.exec((el as HTMLElement).style.transform)
  return m ? Number.parseFloat(m[1]) : 0
}
