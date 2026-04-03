import process from 'node:process'
import { z } from 'zod'

const LEADING_OR_TRAILING_SLASHES_RE = /^\/+|\/+$/g

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform(value => value?.length ? value : undefined)

const envSchema = z.object({
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SWAGGER_PATH: z.string().trim().default('docs').transform(value => value.replace(LEADING_OR_TRAILING_SLASHES_RE, '') || 'docs'),
  SWAGGER_TITLE: z.string().trim().default('SamePage API'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  LOG_PRETTY: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
  DATABASE_URL: z.string().trim().default('postgresql://postgres:postgres@localhost:5432/samepage_docs'),
  JWT_ISSUER: z.string().trim().default('samepage-api'),
  JWT_AUDIENCE: z.string().trim().default('samepage-web'),
  JWT_ACCESS_SECRET: z.string().trim().min(16).default('dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().trim().min(16).default('dev-refresh-secret-change-me'),
  JWT_ACCESS_EXPIRES_IN_SEC: z.coerce.number().int().min(60).default(900),
  JWT_REFRESH_EXPIRES_IN_SEC: z.coerce.number().int().min(300).default(60 * 60 * 24 * 30),
  AUTH_WEB_CALLBACK_LOCAL: z.string().trim().url().default('http://localhost:5173/auth/callback'),
  AUTH_WEB_CALLBACK_PROD: z.string().trim().url().default('https://app.example.com/auth/callback'),
  AUTH_API_BASE_URL_LOCAL: z.string().trim().url().default('http://localhost:3000'),
  AUTH_API_BASE_URL_PROD: z.string().trim().url().default('https://api.example.com'),
  GITHUB_CLIENT_ID: optionalString,
  GITHUB_CLIENT_SECRET: optionalString,
  GITHUB_AUTHORIZATION_ENDPOINT: optionalString.default('https://github.com/login/oauth/authorize'),
  GITHUB_TOKEN_ENDPOINT: optionalString.default('https://github.com/login/oauth/access_token'),
  GITHUB_USERINFO_ENDPOINT: optionalString.default('https://api.github.com/user'),
  GITHUB_SCOPE: z.string().trim().default('read:user user:email'),
  LINUX_DO_CLIENT_ID: optionalString,
  LINUX_DO_CLIENT_SECRET: optionalString,
  LINUX_DO_AUTHORIZATION_ENDPOINT: optionalString,
  LINUX_DO_TOKEN_ENDPOINT: optionalString,
  LINUX_DO_USERINFO_ENDPOINT: optionalString,
  LINUX_DO_SCOPE: z.string().trim().default('openid profile email'),
  ENCRYPTION_KEY: optionalString,
  SYSTEM_ADMIN_EMAILS: z
    .string()
    .trim()
    .optional()
    .transform((value) => {
      if (!value?.length) {
        return []
      }

      return [...new Set(
        value
          .split(',')
          .map(item => item.trim().toLowerCase())
          .filter(Boolean),
      )]
    }),
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
