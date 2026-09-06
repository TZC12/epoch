import type { ComponentType } from 'react'
import type { SvgIconProps } from '@mui/material/SvgIcon'
import Schedule from '@mui/icons-material/Schedule'
import MonitorHeart from '@mui/icons-material/MonitorHeart'
import MenuBook from '@mui/icons-material/MenuBook'
import Medication from '@mui/icons-material/Medication'
import WaterDrop from '@mui/icons-material/WaterDrop'
import RateReview from '@mui/icons-material/RateReview'
import type { Category } from '../types/db'

interface Props {
  category: Category
  className?: string
}

/** 类别 → MUI 图标映射表 */
const ICONS: Record<Category, ComponentType<SvgIconProps>> = {
  rhythm: Schedule, // 节律 · 时钟
  exercise: MonitorHeart, // 运动 · 心率
  study: MenuBook, // 学习 · 书本
  supplement: Medication, // 补剂 · 药品
  skincare: WaterDrop, // 护肤 · 水滴
  review: RateReview, // 复盘 · 评论
}

/** 类别图标（尺寸等样式通过 className 透传给 MUI 图标） */
export function CategoryIcon({ category, className = 'size-4' }: Props) {
  const Icon = ICONS[category]
  return <Icon className={className} />
}
