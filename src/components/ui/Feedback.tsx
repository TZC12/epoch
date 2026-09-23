import './feedback.css'

/**
 * Spinner · 短等待（未知时长）紧凑旋转指示
 * 多通道：旋转 + aria-live。reduced-motion 收口。
 *
 * 这里是全 App 唯一"留在入口 chunk 里"的加载件：Button 在入口图上，
 * 换成 components/motion/loader 的官方 spinner 就会把 motion（46 kB gz）
 * 抬进每次启动都要下载的那份包。其余加载场景一律用官方 Loader。
 */
export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="fb-spin"
      role="status"
      aria-label="加载中"
      style={{ width: size, height: size }}
    />
  )
}

/**
 * StateText · 多通道状态（图标 + 文本 + 语义色），确保状态不依赖单一视觉通道。
 * 用法：空/失败/取消/完成反馈卡片。
 */
export function StateText({ tone = 'neutral', icon, children }: { tone?: 'neutral' | 'processing' | 'success' | 'error' | 'warning'; icon?: string; children: React.ReactNode }) {
  return (
    <p className={`fb-state fb-state--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {icon && <span className="fb-state__icon" aria-hidden="true">{icon}</span>}
      <span className="fb-state__text t-body">{children}</span>
    </p>
  )
}
/** 顶部线性不确定进度（路由/懒加载 chunk 下载中；NProgress 模式）。 */
export function LoaderBar() {
  return (
    <span className="ld-bar" role="progressbar" aria-label="loading" aria-busy="true">
      <span className="ld-bar__fill" aria-hidden="true" />
    </span>
  )
}
