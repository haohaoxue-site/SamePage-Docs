import { describe, expect, it } from 'vitest'
import {
  formatCollabIdentityLabel,
  isExactUserCodeQuery,
  normalizeUserCodeQuery,
  resolveCollabIdentityDisambiguator,
} from '../src/user'

describe('user helpers', () => {
  it('normalizeUserCodeQuery 会 trim 并统一转成大写', () => {
    expect(normalizeUserCodeQuery('  sp-ab23cd4  ')).toBe('SP-AB23CD4')
  })

  it('isExactUserCodeQuery 只接受完整 SP- 前缀和固定字符集', () => {
    expect(isExactUserCodeQuery('SP-AB23CD4')).toBe(true)
    expect(isExactUserCodeQuery('sp-ab23cd4')).toBe(true)
    expect(isExactUserCodeQuery('AB23CD4')).toBe(false)
    expect(isExactUserCodeQuery('SP-AB23CD')).toBe(false)
    expect(isExactUserCodeQuery('SP-AB23CD0')).toBe(false)
    expect(isExactUserCodeQuery('SP-AB23CDI')).toBe(false)
  })

  it('高风险协作展示优先使用 email 作为辨识信息', () => {
    expect(resolveCollabIdentityDisambiguator({
      email: 'zhangsan@example.com',
      userCode: 'SP-ABC2345',
    })).toBe('zhangsan@example.com')
    expect(formatCollabIdentityLabel({
      displayName: '张三',
      email: 'zhangsan@example.com',
      userCode: 'SP-ABC2345',
    })).toBe('张三 · zhangsan@example.com')
  })

  it('无邮箱时高风险协作展示回退到 userCode', () => {
    expect(resolveCollabIdentityDisambiguator({
      email: null,
      userCode: 'SP-ABC2345',
    })).toBe('SP-ABC2345')
    expect(formatCollabIdentityLabel({
      displayName: '张三',
      email: null,
      userCode: 'SP-ABC2345',
    })).toBe('张三 · SP-ABC2345')
  })
})
