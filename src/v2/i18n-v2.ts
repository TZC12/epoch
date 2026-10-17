/* v2 文案单独成包：lib/i18n.ts 在入口 chunk 里，
   这 100 多个 key 进去就是 +2 kB gz —— 实测把入口从 87.97 顶到 90.27，
   越过 90 kB 预算。所以放进 v2 的懒加载块，注册用 addResourceBundle。 */
import i18n from '@/lib/i18n'

const zh = {
  /* ── v2（2026-10-18 重构：助手首页 + 工具层）──
     文案规矩沿用全站：直接、不客服腔、不承诺做不到的事。
     判断句用第二人称现在时，像同事提醒，不像 App 弹窗。 */
  v2: {
    assistant: 'Epoch 助手',
    inTool: '工具面',
    openTools: '打开工具',
    capture: '记一笔',
    askHint: '问 Epoch，或让它替你安排',
    tools: '工具',
    toolsNote: '这些页面和数据都是原来的，只是收在这里。',
    quick: '现在就能做',
    quickEmpty: '今天没有待办了。',
    backToAssistant: '回助手',
  },
  tool: {
    today: '今天', todaySub: '勾掉它',
    plan: '计划', planSub: '排到哪天',
    review: '复习', reviewSub: '到期的词',
    notes: '备忘', notesSub: '随手记与成组',
    progress: '进展', progressSub: '这些天做了什么',
    fit: '健身', fitSub: '今天的课',
    health: '健康', healthSub: '身体记录',
    me: '我的', meSub: '主题 · AI · 账号',
  },
  agent: {
    loading: '在看你的今天…',
    sub: '{{n}} 件待办 · 已完成 {{d}}',
    srcTip: '这些判断来自你手机上的规则，不是云端模型。',
    srcRules: '本机规则',
    srcModel: '来自模型',
    proposals: '它想让你做的事',
    more: '还有 {{n}} 条建议',
    collapse: '收起其余建议',
    basis: '依据',
    steps: '它做了什么',
    adopt: '就这么办',
    doReview: '开始复习',
    adjust: '我自己改',
    no: '不用',
    adopted: '已写进今天',
    adoptFailed: '这条没落成，数据没动',
    noted: '知道了',
    willHoldBack: '这类以后少提',
    markDone: '完成「{{title}}」',
    verdict: {
      light: '今天很空。要不要给明天留件事？',
      heavy: '{{n}} 件主要任务——太多了，先砍一件。',
      split: '{{n}} 件事加 {{m}} 个词到期，先动哪个？',
      due: '{{m}} 个词在等你，五分钟能清完。',
      doing: '{{n}} 件事，按顺序来就行。',
    },
    review: { title: '把 {{n}} 个到期的词过一遍', reason: '最久的那张在第 {{oldest}} 盒，再拖就忘了' },
    trim: { title: '把「{{title}}」挪到随时', reason: '今天挂了 {{n}} 件主要任务' },
    capture: { title: '把「{{title}}」提到今天', reason: '今天只排了 {{n}} 件，收件箱里还有没动的' },
    carry: { title: '今天补一次「{{name}}」', reason: '昨天没做，但连击还在——补上就不断' },
    evidence: {
      due: '到期词数', boxLow: '最低盒', boxHigh: '最高盒',
      mainToday: '今天主要任务', newest: '最新一条',
      inboxOpen: '收件箱未处理', missedYesterday: '昨天漏了', recentDays: '近 3 天做过',
    },
    step: {
      readDue: '读取到期词', sortByBox: '按盒子排序', capSession: '一次限 10 张',
      countMain: '数今天的主要任务', pickNewest: '挑最新的一条',
      readInbox: '读收件箱', findSlot: '找今天的空档',
      scanLogs: '扫描打卡记录', checkStreak: '确认连击是否还活着',
    },
    err: { gone: '这条已经变了', already: '今天已经打过了', unknown: '未知提案' },
  },
}

const en = {
  v2: {
    assistant: 'Epoch assistant',
    inTool: 'Tool',
    openTools: 'Open tools',
    capture: 'Capture',
    askHint: 'Ask Epoch, or let it plan for you',
    tools: 'Tools',
    toolsNote: 'Same pages, same data — just filed in here.',
    quick: 'Do it now',
    quickEmpty: 'Nothing left for today.',
    backToAssistant: 'Back to assistant',
  },
  tool: {
    today: 'Today', todaySub: 'Tick it off',
    plan: 'Plan', planSub: 'Which day',
    review: 'Review', reviewSub: 'Words due',
    notes: 'Notes', notesSub: 'Capture & group',
    progress: 'Progress', progressSub: 'What you did',
    fit: 'Fitness', fitSub: "Today's session",
    health: 'Health', healthSub: 'Body log',
    me: 'You', meSub: 'Theme · AI · Account',
  },
  agent: {
    loading: 'Reading your day…',
    sub: '{{n}} to do · {{d}} done',
    srcTip: 'These calls come from on-device rules, not a cloud model.',
    srcRules: 'On-device rules',
    srcModel: 'From model',
    proposals: 'What it wants you to do',
    more: '{{n}} more suggestions',
    collapse: 'Collapse suggestions',
    basis: 'Basis',
    steps: 'What it did',
    adopt: 'Do it',
    doReview: 'Start review',
    adjust: "I'll adjust",
    no: 'No',
    adopted: 'Added to today',
    adoptFailed: 'Not applied — nothing changed',
    noted: 'Noted',
    willHoldBack: "I'll stop suggesting these",
    markDone: 'Complete “{{title}}”',
    verdict: {
      light: 'Today is wide open. Leave yourself something for tomorrow?',
      heavy: '{{n}} main tasks — too many. Cut one first.',
      split: '{{n}} tasks and {{m}} words due. Which first?',
      due: '{{m}} words are waiting. Five minutes clears them.',
      doing: '{{n}} tasks. Take them in order.',
    },
    review: { title: 'Clear {{n}} due words', reason: 'The oldest sits in box {{oldest}} — it will fade' },
    trim: { title: 'Move “{{title}}” to anytime', reason: '{{n}} main tasks are on today' },
    capture: { title: 'Promote “{{title}}” to today', reason: 'Only {{n}} tasks today, and the inbox is untouched' },
    carry: { title: 'Make up “{{name}}” today', reason: 'Missed yesterday, but the streak is alive — one more keeps it' },
    evidence: {
      due: 'Words due', boxLow: 'Lowest box', boxHigh: 'Highest box',
      mainToday: 'Main tasks today', newest: 'Newest item',
      inboxOpen: 'Inbox open', missedYesterday: 'Missed yesterday', recentDays: 'Done in last 3 days',
    },
    step: {
      readDue: 'Read due words', sortByBox: 'Sort by box', capSession: 'Cap session at 10',
      countMain: 'Count main tasks', pickNewest: 'Pick the newest',
      readInbox: 'Read inbox', findSlot: 'Find a slot today',
      scanLogs: 'Scan check-ins', checkStreak: 'Check if the streak survived',
    },
    err: { gone: 'This changed already', already: 'Already logged today', unknown: 'Unknown proposal' },
  },}

let done = false
export function registerV2Copy(): void {
  if (done) return
  done = true
  i18n.addResourceBundle('zh', 'translation', zh, true, false)
  i18n.addResourceBundle('en', 'translation', en, true, false)
}
