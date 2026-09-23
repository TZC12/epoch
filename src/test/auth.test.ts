import { describe, expect, it } from 'vitest'
import { identifierToEmail, sanitizeUsername, displayAccount, SYNTH_DOMAIN } from '@/lib/auth'

describe('账号标识映射', () => {
  it('邮箱原样（小写化），用户名 → 合成邮箱', () => {
    expect(identifierToEmail('User@Example.COM')).toBe('user@example.com')
    expect(identifierToEmail('  alice ')).toBe(`alice${SYNTH_DOMAIN}`)
  })

  it('用户名清洗：非法字符剔除、转小写', () => {
    expect(sanitizeUsername('Alice 张9 _x!')).toBe('alice9_x')
    expect(sanitizeUsername('张三')).toBe('')
  })

  it('展示名：metadata.username 优先；合成邮箱还原为用户名；真实邮箱原样', () => {
    const mk = (meta: Record<string, unknown>, email?: string) => ({ user_metadata: meta, email } as never)
    expect(displayAccount(mk({ username: 'alice' }, `alice${SYNTH_DOMAIN}`))).toBe('alice')
    expect(displayAccount(mk({}, `alice${SYNTH_DOMAIN}`))).toBe('alice')
    expect(displayAccount(mk({}, 'me@real.com'))).toBe('me@real.com')
    expect(displayAccount(null)).toBe('')
  })
})
