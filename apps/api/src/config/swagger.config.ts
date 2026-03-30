import { registerAs } from '@nestjs/config'
import { getEnv } from './env.schema'

export const swaggerConfig = registerAs('swagger', () => ({
  path: getEnv().SWAGGER_PATH,
  title: getEnv().SWAGGER_TITLE,
}))
