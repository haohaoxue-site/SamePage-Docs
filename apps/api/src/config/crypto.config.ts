import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

export interface CryptoConfig {
  encryptionKey: string
}

const ENCRYPTION_KEY_RE = /^[0-9a-f]{64}$/i

function resolveEncryptionKey(): string {
  const envKey = getEnv().ENCRYPTION_KEY

  if (!envKey) {
    throw new Error('Missing ENCRYPTION_KEY. Configure a 64-character hex key in the environment, for example: openssl rand -hex 32')
  }

  if (!ENCRYPTION_KEY_RE.test(envKey)) {
    throw new Error('Invalid ENCRYPTION_KEY. It must be a 64-character hex string (32 bytes), for example: openssl rand -hex 32')
  }

  return envKey
}

export const cryptoConfig = registerAs('crypto', (): CryptoConfig => ({
  encryptionKey: resolveEncryptionKey(),
}))
