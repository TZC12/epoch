import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu, Plus, ArrowLeft } from 'lucide-react'
import { NetBackground } from '@/components/NetBackground'
import { lazy, Suspense } from 'react'
import { useTheme } from '@/lib/theme'
import { attachScroller } from '@/lib/scroll/scroller'
import { ToolDrawer } from './ToolDrawer'
import { registerV2Copy } from './i18n-v2'

/* 文案在本模块首次求值时就注册：V2Shell 是 v2 所有屏的外壳，
   比任何 v2 组件都早，所以首帧不会闪出 i18n key。 */
registerV2Copy()

import { Mascot } from './Mascot'
import './v2-tokens.css'
import './v2-shell.css'

const MatrixLazy = lazy(() => import('@/components/MatrixBackground').then((m) => ({ default: m.MatrixBackground })))

/**
 * v2 外壳：单根页（助手）+ 底部一条"问 Epoch" + 可下拉的工具层。
 *
 * 三条从旧版踩坑里带来的硬约束，写在这里防止回潮：
 * ① 不给任何滚动祖先加 overflow / transform —— overflow 会静默杀掉后代 sticky，
 *    transform 会让底部固定的 ask bar 找到错误的包含块（见 [[epoch-scroll-system]]）。
 * ② 真实滚动者是文档，派发器仍然只挂一个 window+capture 监听。
 * ③ 背景层继续走主题的 bg 轴，矩阵档必须 lazy（入口 chunk 只剩 ~2 kB 余量）。
 */
export function V2Shell() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const bg = useTheme((s) => s.bg)
  const appRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const [tools, setTools] = useState(false)
  /* 从工具层（旧页面）返回助手：v2 内部跳的页记一笔，返回按钮只在那时出现 */
  const [inTool, setInTool] = useState(false)

  useEffect(() => {
    attachScroller(mainRef.current, appRef.current)
    return () => attachScroller(null)
  }, [])

  useEffect(() => { setInTool(pathname !== '/v2' && pathname !== '/v2/') }, [pathname])

  return (
    <div className="v2-app" ref={appRef} data-in-tool={inTool ? '1' : '0'}>
      {bg === 'matrix' ? (
        <Suspense fallback={null}>
          <MatrixLazy tier="subtle" />
        </Suspense>
      ) : (
        <NetBackground tier="subtle" />
      )}

      <header className="v2-top">
        <button type="button" className="v2-iconbtn" aria-label={t('v2.openTools')} onClick={() => setTools(true)}>
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="v2-top__mid">
          <Mascot size={24} pose={inTool ? 'idle' : 'propose'} />
          <span className="v2-top__name t-small">{inTool ? t('v2.inTool') : t('v2.assistant')}</span>
        </div>
        <button type="button" className="v2-iconbtn" aria-label={t('v2.capture')} onClick={() => setTools(true)}>
          <Plus size={20} aria-hidden="true" />
        </button>
      </header>

      <main ref={mainRef} className="v2-main">
        <Outlet />
      </main>

      {/* 底部不是 tab bar，是一条会说话的输入口：v2 只有一个根，工具层从左上 ☰ 进 */}
      <div className="v2-ask" role="search">
        <button type="button" className="v2-ask__field" onClick={() => setTools(true)}>
          <span className="v2-ask__hint">{t('v2.askHint')}</span>
        </button>
      </div>

      {inTool && (
        <button type="button" className="v2-back" onClick={() => { window.history.back() }}>
          <ArrowLeft size={18} aria-hidden="true" />
          <span>{t('v2.backToAssistant')}</span>
        </button>
      )}

      <ToolDrawer open={tools} onClose={() => setTools(false)} />
    </div>
  )
}
