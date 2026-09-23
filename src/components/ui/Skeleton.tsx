import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ThinkingStates } from './ThinkingStates'
import './skeleton.css'

/** 骨架大空区（路由 / Suspense 等待）：屏幕居中，只显示 thinking states——
    一行 shimmer 状态文本按 2s 轮播，不再铺骨架块。 */
export function HomeSkeleton() {
  const { t } = useTranslation()
  const states = useMemo(() => [t('load.s1'), t('load.s2'), t('load.s3')], [t])
  return (
    <div className="sh-center">
      <ThinkingStates states={states} className="t-h3" />
    </div>
  )
}
