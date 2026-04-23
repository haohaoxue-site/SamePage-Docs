import { describe, expect, it, vi } from 'vitest'
import {
  createRandomUserCode,
  isExactUserCodeQuery,
  normalizeUserCodeQuery,
  resolveUniqueUserCode,
} from '../users.utils'

describe('users.utils', () => {
  it('normalizeUserCodeQuery 会自动 trim 并转成大写', () => {
    expect(normalizeUserCodeQuery('  sp-ab23cd4  ')).toBe('SP-AB23CD4')
  })

  it('isExactUserCodeQuery 只接受完整 SP- 前缀和 7 位固定字符集', () => {
    expect(isExactUserCodeQuery('SP-AB23CD4')).toBe(true)
    expect(isExactUserCodeQuery('sp-ab23cd4')).toBe(true)
    expect(isExactUserCodeQuery('AB23CD4')).toBe(false)
    expect(isExactUserCodeQuery('SP-AB23CD')).toBe(false)
    expect(isExactUserCodeQuery('SP-AB23CD0')).toBe(false)
    expect(isExactUserCodeQuery('SP-AB23CDI')).toBe(false)
  })

  it('createRandomUserCode 会生成 SP- 前缀和固定字符集', () => {
    const randomInt = vi.fn()
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(3)
      .mockReturnValueOnce(4)
      .mockReturnValueOnce(5)
      .mockReturnValueOnce(6)

    expect(createRandomUserCode(randomInt)).toBe('SP-2345678')
    expect(randomInt).toHaveBeenCalledTimes(7)
  })

  it('resolveUniqueUserCode 会在冲突时继续重试直到拿到唯一值', async () => {
    const createUserCode = vi.fn()
      .mockReturnValueOnce('SP-AAAAAAA')
      .mockReturnValueOnce('SP-BBBBBBB')

    const isUserCodeTaken = vi.fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    await expect(resolveUniqueUserCode({
      createUserCode,
      isUserCodeTaken,
    })).resolves.toBe('SP-BBBBBBB')

    expect(createUserCode).toHaveBeenCalledTimes(2)
    expect(isUserCodeTaken).toHaveBeenNthCalledWith(1, 'SP-AAAAAAA')
    expect(isUserCodeTaken).toHaveBeenNthCalledWith(2, 'SP-BBBBBBB')
  })
})
