import process from 'node:process'
import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

export const loggerConfig = registerAs('logger', () => {
  const env = getEnv()
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    level: env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    pretty: env.LOG_PRETTY ?? !isProduction,
  }
})
