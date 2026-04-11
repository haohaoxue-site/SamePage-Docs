import process from 'node:process'
import { z } from 'zod'

const LEADING_OR_TRAILING_SLASHES_RE = /^\/+|\/+$/g

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform(value => value?.length ? value : undefined)

const envSchema = z.object({
  SWAGGER_PATH: z.string().trim().default('docs').transform(value => value.replace(LEADING_OR_TRAILING_SLASHES_RE, '') || 'docs'),
  SWAGGER_TITLE: z.string().trim().default('SamePage API'),
  DATABASE_URL: z.string().trim().default('postgresql://postgres:postgres@localhost:5432/samepage_docs'),
  APP_SECRET: z.string().trim().min(32, 'APP_SECRET 至少需要 32 个字符'),
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,
  LINUX_DO_CLIENT_ID: optionalString,
  LINUX_DO_CLIENT_SECRET: optionalString,
  SYSTEM_ADMIN: z
    .string()
    .trim()
    .toLowerCase()
    .email(),
})

export type AppEnv = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): AppEnv {
  return envSchema.parse(config)
}

let cachedEnv: AppEnv | undefined

export function getEnv(): AppEnv {
  cachedEnv ??= envSchema.parse(process.env)
  return cachedEnv
}
