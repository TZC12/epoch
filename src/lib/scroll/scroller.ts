/* ═══════════════════════════════════════════════════════════════════
   滚动系统基座 · 全站唯一的滚动派发器
   ───────────────────────────────────────────────────────────────────
   为什么要有这个文件：App 的滚动发生在容器里（.app-main，或其拉长后的文档），
   不是干净的 window。任何"各自 addEventListener('scroll')"的写法都会踩三个坑：
   ① 监听目标的假设容易错（见下），② 每次切页/每个组件挂一个监听 = 监听器堆积，
   ③ 每帧读 scrollTop/scrollHeight 会触发强制同步布局。

   这里只做一个订阅者：window + capture + passive + rAF 合帧，把结果发布成
   CSS 自定义属性（--scroll-y / --scroll-px / --scroll-p）+ 一个布尔态
   （data-scrolled），让绝大多数效果留在 CSS 里，JS 不再逐帧参与。

   ⚠ 真正的滚动者不一定是 .app-main。
   .app 只有 min-height:100dvh、没给 .app-main 定高，所以内容一长就是
   **文档在滚**（.app-main 的 overflow-y:auto 形同虚设，MatrixBackground 一直用
   document capture 收 scroll 事件正是这个原因）。第一版派发器只监听传入元素，
   结果 --scroll-p 恒为 0、吸顶判定停在原位——这类"容器以为是谁在滚"的假设必须实测。
   结论：监听一律挂 window + capture。元素的 scroll 不冒泡，但**会在捕获路径上
   经过 window**（window → document → html → body → .app → .app-main），所以
   capture 一个监听同时收得到文档滚动和容器滚动，不需要挂两个；读数侧同样现读
   （source()），谁真的能滚就取谁。

   不引 GSAP/ScrollTrigger：吸顶/吸附/横滚用原生 CSS 就够，进度联动用 CSS 变量；
   JS 侧需要动画的地方已有 motion（framer-motion）——同一职责不留第二套引擎。
   ═══════════════════════════════════════════════════════════════════ */

export interface ScrollState {
  /** 已滚距离（px） */
  top: number
  /** 可滚总量（px）；0 = 内容不满一屏 */
  max: number
  /** 0–1 进度；max=0 时为 0 */
  p: number
}

const IDLE: ScrollState = { top: 0, max: 0, p: 0 }

let node: HTMLElement | null = null
/** 变量宿主：默认=滚动容器本身；AppShell 传 .app，让背景层（.netbg 在 .app-main 之外）
    也能继承到同一组滚动变量，避免"内容一套 CSS 变量、背景另一套 JS 监听"。 */
let host: HTMLElement | null = null
let frame = 0
let current: ScrollState = IDLE
let ro: ResizeObserver | null = null
const subs = new Set<(s: ScrollState) => void>()

/* ── 按页名记忆滚动位置 ──
   成熟 App 的标签页行为（iOS/Android 同款）：切走再切回 = 回到你读到的地方，
   首次进入 = 顶部。以前每次切页无脑归零，翻到备忘/计划列表底部切走再回来就得
   从头找起——这是"像网页"而不是"像 App"的那种细节。 */
const memory = new Map<string, number>()
let scope: string | null = null
function measure(): void {
  frame = 0
  if (!node) return
  const { top, max } = source()
  const p = max > 0 ? Math.min(1, top / max) : 0
  /* 值没变就不碰 style/attribute：滚动条回弹时会有连续同值帧，
     属性写入触发样式重算，等于自己制造卡顿。 */
  if (Math.abs(top - current.top) < 0.5 && Math.abs(max - current.max) < 0.5) return
  current = { top, max, p }
  const s = (host ?? node).style
  s.setProperty('--scroll-y', `${Math.round(top)}px`)
  /* 无单位版：CSS 里要做除法的（opacity: 1 - scroll-px/1400）只能用这个，
     长度除以数字得到的还是长度，塞不进 opacity。 */
  s.setProperty('--scroll-px', String(Math.round(top)))
  s.setProperty('--scroll-p', p.toFixed(4))
  /* 布尔态给 CSS 用（吸顶后的描边、进度线的显隐），比在 JS 里加类名便宜 */
  const crossed = top > 8 ? '1' : '0'
  if (node.dataset.scrolled !== crossed) node.dataset.scrolled = crossed
  /* 实时把位置记在当前页名下（而不是"离开时再存"）：React 的 cleanup 跑在
     新页 DOM 已经提交之后，那时 scrollTop 已经被新内容改写，存下来的是脏值。 */
  if (scope) memory.set(scope, top)
  for (const fn of subs) fn(current)
}

/** 现读"谁在滚"：容器自己真能滚就用它，否则回落文档（原因见文件头）。 */
function source(): { top: number; max: number } {
  const n = node
  if (n) {
    const own = n.scrollHeight - n.clientHeight
    if (own > 1) return { top: n.scrollTop, max: own }
  }
  const de = (document.scrollingElement ?? document.documentElement) as HTMLElement
  return { top: de.scrollTop || window.scrollY || 0, max: Math.max(0, de.scrollHeight - de.clientHeight) }
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(measure)
}

function onScroll(): void { schedule() }

/** AppShell 挂载/换页时调用；传 null 解绑。同一元素重复 attach 是幂等的。 */
export function attachScroller(next: HTMLElement | null, nextHost?: HTMLElement | null): void {
  if (next === node && (nextHost === host || nextHost === undefined)) {
    if (next) schedule()
    return
  }
  const prevHost = host
  host = nextHost ?? next ?? null
  if (node) {
    /* 唯一监听点：window capture，同时覆盖文档滚动与容器滚动 */
    window.removeEventListener('scroll', onScroll, true)
    ro?.disconnect()
    const s = (prevHost ?? node).style
    s.removeProperty('--scroll-y'); s.removeProperty('--scroll-px'); s.removeProperty('--scroll-p')
    node.dataset.scrolled = '0'
  }
  node = next
  if (node) {
    /* passive：不拦默认滚动，也不劫持滚轮/触摸（规范红线） */
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    /* 内容高度变化（切页、折叠展开、图片/字体加载完）要重算 max，
       否则进度线会按旧的最大值算，滚到底停在 0.6 之类 */
    schedule()
  }
  if (typeof ResizeObserver !== 'undefined') {
    ro?.disconnect()
    /* 观察 .app-main 与文档根：真实滚动者可能是其中一个，两边的尺寸变化都要重算 */
    ro = node ? new ResizeObserver(() => schedule()) : null
    if (node && ro) {
      ro.observe(node)
      const de = document.scrollingElement
      if (de && de !== node) ro.observe(de)
    }
  }
}

/** 当前滚动容器（Reveal 的 IntersectionObserver root 要用它）。 */
export function getScroller(): HTMLElement | null { return node }

/** 读最近一次测量值（不触发布局读取）。 */
export function readScroll(): ScrollState { return current }

function jumpTo(top: number): void {
  const n = node
  if (n && n.scrollHeight - n.clientHeight > 1) n.scrollTop = top
  else window.scrollTo(0, top)
}

/**
 * 切页时调用（AppShell 的 layout effect）：把滚动位置归属到新页名，
 * 并恢复它上次离开时的位置（首次进入=0）。
 *
 * 两段恢复：DOM 刚提交时图片/字体/折叠态可能还没把内容撑到最终高度，
 * 一次赋值会被浏览器夹到当时的高度上限。所以再补两帧，且只在
 * "还没到位"时补——用户这时已经开始滚的话不要跟他抢。
 */
export function setScrollScope(next: string): void {
  if (next === scope) return
  scope = next
  const want = memory.get(next) ?? 0
  jumpTo(want)
  memory.set(next, want)
  schedule()
  if (want <= 0) return
  let tries = 0
  const retry = (): void => {
    tries += 1
    const got = source().top
    if (got < want - 2 && tries <= 2) {
      jumpTo(want)
      schedule()
      requestAnimationFrame(retry)
    }
  }
  requestAnimationFrame(retry)
}

/** 点当前标签 = 回顶（iOS 约定）。smooth 在减弱动效下自动退成直达。 */
export function scrollToTop(): void {
  const smooth = !prefersReducedMotion()
  if (smooth) {
    const n = node
    if (n && n.scrollHeight - n.clientHeight > 1) n.scrollTo({ top: 0, behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    jumpTo(0)
  }
  if (scope) memory.set(scope, 0)
  schedule()
}

/** 订阅滚动（rAF 合帧后回调）。返回退订函数——组件卸载必须调，否则切页后残留。 */
export function subscribeScroll(fn: (s: ScrollState) => void): () => void {
  subs.add(fn)
  fn(current)
  return () => { subs.delete(fn) }
}

/** 减弱动效判定与全站同一处口径（global.css 的媒体查询管 CSS，JS 侧用这个）。 */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}
