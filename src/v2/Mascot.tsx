import { useId } from 'react'
import './mascot.css'

/* ═══════════════════════════════════════════════════════════════════
   Mascot · Epoch 的小墨灵
   ───────────────────────────────────────────────────────────────────
   它是 v2 里"助手"这个概念唯一的视觉化身：所有 agent 状态都靠它表达，
   而不是靠一个头像照片或一个通用 sparkle 图标。

   三条约束：
   ① 墨线 1.8（与图标族同一支笔）+ 单色 blob 填充 + 白眼球墨瞳孔。
   ② 姿态 = 语义，且**不只靠颜色**：每个姿态同时换轮廓、眼睛形状和动效，
      色盲与暗色下仍可读（这条是无障碍底线，不是锦上添花）。
   ③ 尺寸只给三档：24（行内）/ 40（卡头）/ 72（首屏主角）。
      24 档不画眼睛细节——太小会变脏。

   不用 motion 库：这是 6 个离散状态之间的切换，纯 CSS transition + keyframes
   就够（见 [[epoch-effects-decisions]] 的 CSS vs canvas 原则）。
   ═══════════════════════════════════════════════════════════════════ */

export type MascotPose = 'idle' | 'think' | 'propose' | 'done' | 'no' | 'err'

export interface MascotProps {
  pose?: MascotPose
  /** 像素边长，只认 24（行内）/ 48（卡头）/ 72（首屏主角）三档 */
  size?: 24 | 48 | 72
  /** 装饰性（默认）：状态由旁边的文字承载时不要重复播报 */
  decorative?: boolean
  /** 无障碍：当它是状态的唯一载体时传 label，会渲染成 role=img */
  label?: string
  className?: string
}

/* 三套轮廓：坐（idle/think）、前倾（propose）、跳（done）；no/err 复用前倾 */
const BODY: Record<'sit' | 'lean' | 'jump', string> = {
  /* 圆角团子，左肩略高——完全对称会显得像图标而不像角色 */
  sit: 'M32 8c11 0 20 7 20 17 0 6-2 9-2 14s1 8 1 11c0 7-9 11-19 11S13 57 13 50c0-3 1-7 1-12s-2-8-2-13C12 15 21 8 32 8Z',
  lean: 'M34 9c11 0 19 8 19 18 0 6-3 9-3 14s2 8 2 11c0 7-9 10-18 10s-18-4-18-11c0-3 2-7 2-12s-3-8-3-13C15 16 23 9 34 9Z',
  jump: 'M32 5c12 0 21 8 21 19 0 7-3 10-3 15 0 4 2 7 2 10 0 8-9 11-20 11s-20-3-20-11c0-3 2-6 2-10 0-5-3-8-3-15C11 13 20 5 32 5Z',
}

const POSE_BODY: Record<MascotPose, keyof typeof BODY> = {
  idle: 'sit', think: 'sit', propose: 'lean', done: 'jump', no: 'lean', err: 'sit',
}

/**
 * 眼睛形状才是姿态的真载体（颜色只是加强）。
 * 每种都写成"闭眼笑 / 睁大 / 斜看 / 半闭"这种形状差异，而不是只换个颜色。
 */
function Eyes({ pose, uid }: { pose: MascotPose; uid: string }) {
  const white = `url(#${uid}-eye)`
  if (pose === 'done') {
    /* 闭眼笑：两条上弯的弧 */
    return (
      <g className="v2m-eyes">
        <path d="M23 30c2-3 6-3 8 0" stroke="var(--v2-ink)" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <path d="M34 30c2-3 6-3 8 0" stroke="var(--v2-ink)" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </g>
    )
  }
  if (pose === 'no') {
    /* 撇：一高一低 + 嘴向下 */
    return (
      <g className="v2m-eyes">
        <circle cx={26} cy={29} r={4.6} fill={white} />
        <circle cx={38} cy={31} r={4.6} fill={white} />
        <circle cx={27.6} cy={30.4} r={2} fill="var(--v2-ink)" />
        <circle cx={36.4} cy={32.2} r={2} fill="var(--v2-ink)" />
      </g>
    )
  }
  if (pose === 'think') {
    /* 向上看：瞳孔顶到眼球上沿 */
    return (
      <g className="v2m-eyes">
        <circle cx={26} cy={30} r={5} fill={white} />
        <circle cx={38} cy={30} r={5} fill={white} />
        <circle cx={26.6} cy={27.6} r={2.1} fill="var(--v2-ink)" />
        <circle cx={37.4} cy={27.6} r={2.1} fill="var(--v2-ink)" />
      </g>
    )
  }
  if (pose === 'err') {
    /* 半闭 + 汗滴 */
    return (
      <g className="v2m-eyes">
        <path d="M21.5 30h9" stroke="var(--v2-ink)" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M33.5 30h9" stroke="var(--v2-ink)" strokeWidth={1.8} strokeLinecap="round" />
        <path d="M47 20c1.6 2 2 3.4 1 4.4-1 1-2.4.4-3-1-.5-1.2.4-2.4 2-3.4Z" fill="var(--blob-blue)" stroke="var(--v2-ink)" strokeWidth={1.2} />
      </g>
    )
  }
  /* idle / propose：正睁，propose 时瞳孔朝前下方（看着提案） */
  const px = pose === 'propose' ? 1.2 : 0
  const py = pose === 'propose' ? 1.4 : 0
  return (
    <g className="v2m-eyes">
      <circle cx={26} cy={30} r={5} fill={white} />
      <circle cx={38} cy={30} r={5} fill={white} />
      <circle cx={26 + px} cy={30 + py} r={2.1} fill="var(--v2-ink)" />
      <circle cx={38 + px} cy={30 + py} r={2.1} fill="var(--v2-ink)" />
    </g>
  )
}

export function Mascot({ pose = 'idle', size = 48, decorative = true, label, className = '' }: MascotProps) {
  const uid = `v2m-${useId().replace(/:/g, '')}`
  const tiny = size <= 24
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`v2m v2m--${pose} ${className}`.trim()}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : (label ?? 'Epoch 助手')}
    >
      <defs>
        {/* 眼球白：暗色下不能是纯白，跟着卡面走 */}
        <radialGradient id={`${uid}-eye`}>
          <stop offset="0%" stopColor="var(--v2-card)" />
          <stop offset="100%" stopColor="var(--v2-card)" />
        </radialGradient>
      </defs>
      {/* 墨影：角色脚下的实心块，是这套风格的签名（参考图时钟/握手下方那块黑） */}
      <ellipse className="v2m-shadow" cx={32} cy={57} rx={13} ry={3.4} fill="var(--v2-ink)" opacity={0.9} />
      <g className="v2m-body">
        <path d={BODY[POSE_BODY[pose]]} fill={`var(--mascot-${pose === 'no' ? 'no' : pose})`} stroke="var(--v2-ink)" strokeWidth={1.8} strokeLinejoin="round" />
        {!tiny && <Eyes pose={pose} uid={uid} />}
        {/* 嘴：只在 done/no/err 出现，idle 不画嘴=更中性，也不会在小尺寸下发糊 */}
        {!tiny && (pose === 'done' || pose === 'no') && (
          <path
            d={pose === 'done' ? 'M28 38c2.4 2.6 6 2.6 8.4 0' : 'M28 41c2.4-2.6 6-2.6 8.4 0'}
            stroke="var(--v2-ink)"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </g>
      {/* propose：伸出一只小手托着提案；think：头顶三个点 */}
      {!tiny && pose === 'propose' && (
        <path className="v2m-arm" d="M52 34c4 .6 6 2.4 6.6 5" stroke="var(--v2-ink)" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      )}
      {!tiny && pose === 'think' && (
        <g className="v2m-dots" fill="var(--v2-ink)">
          <circle cx={48} cy={12} r={1.7} />
          <circle cx={54} cy={9} r={1.7} />
          <circle cx={59} cy={6} r={1.7} />
        </g>
      )}
    </svg>
  )
}
