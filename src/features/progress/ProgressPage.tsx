import { DotMatrix } from './DotMatrix'
import { HabitCalendar } from './HabitCalendar'
import { WeatherCard } from '@/components/WeatherCard'
import './progress.css'

/**
 * Progress（回顾层）：天气 → 完成任务热度表 → 习惯回顾。
 * 页头标题/副标题按用户指示撤除（进页即见内容）；目标、本周复盘、写给自己、
 * 近 70 天点阵一并撤下，等功能定型再回（数据层与 actions 全部保留）。
 */
export default function ProgressPage() {
  return (
    <div className="prog">
      <WeatherCard />
      <DotMatrix />
      <HabitCalendar />
    </div>
  )
}
