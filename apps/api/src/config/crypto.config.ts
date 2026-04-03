import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { Logger } from '@nestjs/common'
import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

export interface CryptoConfig {
  encryptionKey: string
}

const ENCRYPTION_KEY_PATH = join(process.cwd(), '.encryption-key')
const ENCRYPTION_KEY_RE = /^[0-9a-f]{64}$/i

function resolveEncryptionKey(): string {
  const logger = new Logger('CryptoConfig')
  const envKey = getEnv().ENCRYPTION_KEY

  if (envKey) {
    if (!ENCRYPTION_KEY_RE.test(envKey)) {
      throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
    }
    return envKey
  }

  if (existsSync(ENCRYPTION_KEY_PATH)) {
    const fileKey = readFileSync(ENCRYPTION_KEY_PATH, 'utf-8').trim()
    if (ENCRYPTION_KEY_RE.test(fileKey)) {
      return fileKey
    }
    logger.warn(`Invalid encryption key in ${ENCRYPTION_KEY_PATH}, regenerating`)
  }

  const key = randomBytes(32).toString('hex')
  writeFileSync(ENCRYPTION_KEY_PATH, key, 'utf-8')
  logger.log(`Generated encryption key → ${ENCRYPTION_KEY_PATH}`)

  return key
}

export const cryptoConfig = registerAs('crypto', (): CryptoConfig => ({
  encryptionKey: resolveEncryptionKey(),
}))
