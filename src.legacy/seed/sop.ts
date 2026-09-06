import type { Category } from '../types/db'

export interface SeedTemplate {
  title: string
  time_of_day: string | null
  category: Category
  weekdays: number[] // 0=周一 … 6=周日
  is_minimum_standard: boolean
  notes: string | null
  sort_order: number
}

export interface SeedDayTheme {
  weekday: number
  theme: string
}

export const DAY_THEMES: SeedDayTheme[] = [
  { weekday: 0, theme: '进入状态日 · 调整状态 + 产品思维学习' },
  { weekday: 1, theme: '设计提升日 · 提升审美和商业设计能力' },
  { weekday: 2, theme: '英语提升日 · 长期积累海外能力' },
  { weekday: 3, theme: '管理与商业日 · 从设计师变成经营者' },
  { weekday: 4, theme: '汽车行业深入日 · 建立行业壁垒' },
  { weekday: 5, theme: '总结 + 输出日 · 最后一个工作日' },
  { weekday: 6, theme: '个人成长日 · 休息日' },
]

type Raw = Omit<SeedTemplate, 'sort_order'>

const T = (
  title: string,
  time: string | null,
  category: Category,
  weekdays: number[],
  isMinimum: boolean,
  notes: string | null = null,
): Raw => ({ title, time_of_day: time, category, weekdays, is_minimum_standard: isMinimum, notes })

const WORKDAYS = [0, 1, 2, 3, 4, 5] // 周一~周六
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const SUNDAY = [6]

const RAW_TEMPLATES: Raw[] = [
  // ===== 早晨（工作日 周一~周六）=====
  T('起床', '06:40:00', 'rhythm', WORKDAYS, false, '喝水300ml，不看手机'),
  T('体态训练', '06:45:00', 'exercise', WORKDAYS, true, '下巴回收20次、墙天使10次、胸肌拉伸'),
  T('早餐', '07:00:00', 'rhythm', WORKDAYS, false, '鸡蛋2个+牛奶/豆浆+主食'),
  T('早餐后补剂', '07:05:00', 'supplement', WORKDAYS, false, '鱼油+辅酶Q10+维生素D3'),
  T('出门上班', '07:10:00', 'rhythm', WORKDAYS, false, null),
  // ===== 周日早晨 =====
  T('起床', '07:30:00', 'rhythm', SUNDAY, false, '休息日，不要睡到中午'),
  T('早餐', '08:00:00', 'rhythm', SUNDAY, false, null),
  T('早餐后补剂', '08:05:00', 'supplement', SUNDAY, false, '鱼油+辅酶Q10+维生素D3'),
  T('体态训练5分钟', '08:20:00', 'exercise', SUNDAY, true, '休息日任意时间完成，5分钟即可'),
  T('户外运动', '08:30:00', 'exercise', SUNDAY, true, '跑步/徒步/骑车，约60分钟'),
  T('深度学习（2小时）', '10:00:00', 'study', SUNDAY, true, '一次两小时不间断；主题轮换：第1周产品/第2周设计/第3周管理/第4周英语'),
  // ===== 中午 =====
  T('午饭', '12:00:00', 'rhythm', [0], false, '正常饮食，保证肉蛋'),
  T('散步10分钟', '12:30:00', 'exercise', [0], false, '午饭后'),
  T('午饭后补剂', '12:35:00', 'supplement', ALL_DAYS, false, '维生素C'),
  // ===== 下午（周日）=====
  T('个人项目', '13:30:00', 'study', SUNDAY, false, '任选：优化公司宣传资料/产品分析/设计练习/学AI工具'),
  T('整理', '16:00:00', 'rhythm', SUNDAY, false, '房间/衣服/文件/下周计划'),
  // ===== 晚间 =====
  T('晚饭', '18:00:00', 'rhythm', SUNDAY, false, null),
  T('娱乐', '19:00:00', 'rhythm', SUNDAY, false, null),
  T('晚饭', '19:30:00', 'rhythm', [0, 1, 2, 3, 4], false, '蛋白质+蔬菜+主食'),
  T('晚饭', '20:00:00', 'rhythm', [5], false, '周六晚上不安排太重'),
  T('慢跑30分钟', '20:15:00', 'exercise', [0, 4], true, null),
  T('力量训练', '20:15:00', 'exercise', [1, 3], true, '深蹲15×3、俯卧撑10×3、平板支撑40秒×3、肩背训练'),
  T('跑步30分钟', '20:15:00', 'exercise', [2], true, '晚上跑步'),
  T('散步30分钟', '20:40:00', 'exercise', [5], true, '晚间散步，计入当日运动'),
  T('洗澡', '20:30:00', 'rhythm', SUNDAY, false, null),
  T('洗澡', '21:00:00', 'rhythm', [0, 2, 4], false, null),
  T('洗澡', '21:10:00', 'rhythm', [5], false, null),
  T('护肤（整理皮肤）', '21:00:00', 'skincare', SUNDAY, true, '每周护肤安排：周日整理皮肤'),
  T('洗澡', '21:20:00', 'rhythm', [1, 3], false, null),
  T('护肤', '21:20:00', 'skincare', [0, 2, 4], true, '正常护肤：洁面→水→烟酰胺→乳液'),
  T('护肤（水杨酸）', '21:30:00', 'skincare', [1, 3], true, '每周护肤安排：周二/周四水杨酸'),
  T('护肤（补水面膜）', '21:30:00', 'skincare', [5], true, null),
  T('规划下周', '21:30:00', 'review', SUNDAY, false, null),
  // ===== 夜间学习 =====
  T('学习：产品思维', '22:00:00', 'study', [0], true, '50分钟：看优秀产品宣传/分析竞品/学习用户需求'),
  T(
    '学习：设计',
    '22:00:00',
    'study',
    [1],
    true,
    '60分钟；不学软件：苹果官网、OpenAI设计、Behance优秀案例、汽车品牌视觉；记录「为什么这个设计让我觉得高级？」',
  ),
  T('学习：英语', '22:00:00', 'study', [2], true, '40分钟：20分钟汽车行业英语（产品介绍/邮件表达/技术词汇）+ 20分钟日常听力'),
  T('学习：管理与商业', '22:00:00', 'study', [3], true, '企业管理/供应链/成本控制/销售逻辑；问自己：如果我是老板，这件事为什么这么做？'),
  T('学习：汽车行业', '22:00:00', 'study', [4], true, 'Gentherm/Lear/Adient/Bosch；产品结构、OEM供应链、汽车舒适系统、NVH'),
  T('周总结', '22:00:00', 'review', [5], true, '本周做了什么？学到了什么？公司有哪些问题？下周改什么？'),
  T('娱乐30分钟', '22:40:00', 'rhythm', [5], false, '总结后的固定娱乐时间'),
  T('复盘', '22:50:00', 'review', [0], false, '20分钟，记录今天工作问题'),
  // ===== 睡觉 =====
  T('睡觉', '23:00:00', 'rhythm', SUNDAY, true, null),
  T('睡觉', '23:20:00', 'rhythm', [0], true, null),
  T('睡觉', '23:30:00', 'rhythm', [1, 2, 3, 4, 5], true, '最低标准：23:30前睡'),
]

export const SOP_TEMPLATES: SeedTemplate[] = RAW_TEMPLATES.map((t, i) => ({ ...t, sort_order: i }))
