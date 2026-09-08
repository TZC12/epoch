import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

/**
 * i18n（zh/en 双语）——取代旧版「中文 DOM 文本遍历器」架构。
 * 规则：所有 UI 字符串必须走 t()；禁止在组件里硬编码中英文文案。
 * Phase 1 先落骨架与公共词条；页面词条随 Phase 3 移植逐屏补齐。
 */
const zh = {
  nav: { today: '今天', plan: '计划', progress: '进展', me: '我的' },
  common: {
    save: '保存',
    cancel: '取消',
    delete: '删除',
    undo: '撤销',
    confirm: '确认',
    back: '返回',
    done: '完成',
    skip: '跳过',
    reschedule: '改期',
    edit: '编辑',
    create: '新建',
    close: '关闭',
    retry: '重试',
    saved: '已保存',
    deleted: '已删除',
    loading: '加载中…',
    error: '出错了',
    porting: '这一页正在移植中',
  },
  today: {
    greeting: '今天',
    allDone: '今天的事都做完了',
    allDoneSub: '去生活。明天见。',
    clear: '今天还是空的',
    planMyDay: '规划今天',
  },
  plan: {
    inbox: '收集箱',
    today: '今天',
    scheduled: '已排',
    capturePlaceholder: '想到什么，先记下来…',
  },
  progress: { title: '真实进展', sub: '证据，不是数字游戏' },
  me: { title: '我的系统' },
  settings: {
    title: '偏好设置',
    appearance: '外观',
    theme: '主题',
    language: '语言',
    themeSystem: '跟随系统',
    themeLight: '浅色',
    themeDark: '深色',
    langZh: '中文',
    langEn: 'English',
  },
  a11y: { switchTab: '切换到{{name}}' },
}

const en = {
  nav: { today: 'Today', plan: 'Plan', progress: 'Progress', me: 'Me' },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    undo: 'Undo',
    confirm: 'Confirm',
    back: 'Back',
    done: 'Done',
    skip: 'Skip',
    reschedule: 'Reschedule',
    edit: 'Edit',
    create: 'New',
    close: 'Close',
    retry: 'Retry',
    saved: 'Saved',
    deleted: 'Deleted',
    loading: 'Loading…',
    error: 'Something went wrong',
    porting: 'This page is being ported',
  },
  today: {
    greeting: 'Today',
    allDone: 'Everything is done.',
    allDoneSub: 'Go live your life. See you tomorrow.',
    clear: 'Your day is clear.',
    planMyDay: 'Plan my day',
  },
  plan: {
    inbox: 'Inbox',
    today: 'Today',
    scheduled: 'Scheduled',
    capturePlaceholder: 'Capture anything…',
  },
  progress: { title: 'Real progress', sub: 'Evidence, not vanity metrics' },
  me: { title: 'My system' },
  settings: {
    title: 'Preferences',
    appearance: 'Appearance',
    theme: 'Theme',
    language: 'Language',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    langZh: '中文',
    langEn: 'English',
  },
  a11y: { switchTab: 'Go to {{name}}' },
}

export const LANG_KEY = 'epoch-lang'

const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null
const initial = stored === 'en' || stored === 'zh' ? stored : 'zh'

void i18n.use(initReactI18next).init({
  resources: { zh: { translation: zh }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
})

export function setLang(lng: 'zh' | 'en') {
  localStorage.setItem(LANG_KEY, lng)
  document.documentElement.lang = lng === 'zh' ? 'zh-CN' : 'en'
  void i18n.changeLanguage(lng)
}

if (typeof document !== 'undefined') {
  document.documentElement.lang = initial === 'zh' ? 'zh-CN' : 'en'
}

export default i18n
