import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Liquid } from 'liquid-gooey'

export interface LiquidFabItem {
  key: string
  label: string
  icon: ReactNode
  onClick: () => void
}

const FAN = [{ x: 0, y: -64 }, { x: -54, y: -34 }, { x: -64, y: 0 }]
const SPRING = { duration: 550, ease: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }

/**
 * 液体融合 FAB（liquid-gooey）：+ 展开最多 3 个快捷动作，
 * 表面像水珠一样分离/合并（SVG 滤镜融合轮廓 + 清晰内容双层）。
 * 节奏：开=自内向外交错 40ms 弹出、图标在水珠落定后淡入；
 *       收=反序（最外先缩回）——开合同样式镜像，不是一齐砸回去；
 *       + 旋转 45° 成 ×；点菜单外任意处收回。
 * 定位锚复用 .home-fab（fixed 右下 + 桌面居中），样式在 today/home.css。
 */
export function LiquidFab({ menuLabel, items }: { menuLabel: string; items: LiquidFabItem[] }) {
  const [open, setOpen] = useState(false)
  const subs = items.slice(0, 3)
  const n = subs.length
  return (
    <div className="home-fab">
      {open && <div className="fab-scrim" aria-hidden="true" onClick={() => setOpen(false)} />}
      <Liquid fill="var(--ink)" blur={8} filterPadding={80} shadow="0 12px 28px rgba(28,27,25,0.32)">
        {subs.map((it, i) => {
          const f = FAN[Math.min(i, FAN.length - 1)]
          return (
            <Liquid.Item key={it.key} className={`fab-item ${open ? 'fab-item--on' : ''}`} x={open ? f.x : 0} y={open ? f.y : 0} transition={SPRING} delay={open ? i * 40 : (n - 1 - i) * 40}>
              <button type="button" className="fab-btn fab-btn--sub" tabIndex={open ? 0 : -1} aria-label={it.label}
                onClick={() => { setOpen(false); it.onClick() }}>
                {it.icon}
              </button>
            </Liquid.Item>
          )
        })}
        <Liquid.Item>
          <button type="button" className="fab-btn" aria-label={menuLabel} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            <Plus size={22} strokeWidth={2} aria-hidden="true" className="fab-btn__plus" />
          </button>
        </Liquid.Item>
      </Liquid>
    </div>
  )
}
