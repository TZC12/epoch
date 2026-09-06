/** 统一毛玻璃卡片样式 — 借鉴 TraeWork 的 border/overlay/shadow 规则
 * 增强毛玻璃质感：分层透明 + saturate + 内部高光 + 更细腻的 border */
export const cardSx = {
  border: '1px solid',
  borderColor: 'var(--tw-border-l1)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04), inset 0 0.5px 0 rgba(255,255,255,0.5)',
  backgroundColor: 'var(--glass-bg)',
  backdropFilter: 'blur(20px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
}

/** 强毛玻璃 — 用于底部弹层、对话框等需要更强隔离的场景 */
export const cardSxStrong = {
  border: '1px solid',
  borderColor: 'var(--tw-border-l1)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 8px 32px rgba(0,0,0,0.06), inset 0 0.5px 0 rgba(255,255,255,0.5)',
  backgroundColor: 'var(--glass-bg-strong)',
  backdropFilter: 'blur(28px) saturate(1.8)',
  WebkitBackdropFilter: 'blur(28px) saturate(1.8)',
}
