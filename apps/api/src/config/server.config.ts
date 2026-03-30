import process from 'node:process'
import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

export const serverConfig = registerAs('server', () => ({
  port: getEnv().SERVER_PORT,
  apiPrefix: 'api',
  isProduction: process.env.NODE_ENV === 'production',
}))
