/**
 * 运行时构建身份：读 vite 插件 epoch-app-version 注入的三枚 meta。
 * 用途只有一个——让"线上现在是哪个版本"在 App 内就能看见并报出来。
 *
 * dev server 下这三枚 meta 不存在（插件 apply: 'build'），所以返回 null。
 * 调用方（我的 → 关于）据此整条不渲染：宁可什么都不显示，
 * 也不要显示一个假的或写着 dev 的版本号，让人以为线上出问题了。
 */
export interface BuildInfo {
  /** 完整 commit（Pages 构建为远端 SHA，与本地 SHA 本就不同） */
  commit: string
  /** 短 SHA，给人看/给 UI 用 */
  short: string
  /** ISO 构建时间；理论上可能为空串（旧构建） */
  builtAt: string
  /** production / preview / local */
  env: string
}

const content = (doc: Document, name: string): string =>
  doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() ?? ''

export function readBuildInfo(doc: Document = document): BuildInfo | null {
  const commit = content(doc, 'app-version')
  if (!commit) return null
  return { commit, short: commit.slice(0, 7), builtAt: content(doc, 'app-built'), env: content(doc, 'app-env') || '—' }
}

/** ISO → 本地可读时间；读不出合法日期就退回原文（不让一个空 meta 变成 Invalid Date）。 */
export function formatBuildTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

/** 复制进剪贴板的那一行：紧凑、含排查需要的全部信息。 */
export function buildInfoLine(b: BuildInfo): string {
  return `Epoch ${b.commit} · ${b.env} · ${b.builtAt}`
}
