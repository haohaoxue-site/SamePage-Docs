import type { NestFastifyApplication } from '@nestjs/platform-fastify'
import { promises } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import helmet from '@fastify/helmet'
import { Logger as AppLogger, RequestMethod, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './filters/global-exception.filter'
import { ResponseInterceptor } from './interceptors/response.interceptor'

async function bootstrap() {
  const logger = new AppLogger('Bootstrap')
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  )
  app.useLogger(app.get(Logger))
  app.enableShutdownHooks()

  const configService = app.get(ConfigService)
  const port = configService.getOrThrow<number>('server.port')
  const apiPrefix = configService.getOrThrow<string>('server.apiPrefix')
  const swaggerPath = configService.getOrThrow<string>('swagger.path')
  const swaggerTitle = configService.getOrThrow<string>('swagger.title')

  await app.register(helmet)

  app.enableCors({
    origin: true,
    credentials: true,
  })
  app.setGlobalPrefix(apiPrefix, {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      stopAtFirstError: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  )
  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(
    new LoggerErrorInterceptor(),
    new ResponseInterceptor(),
  )

  const pkg = JSON.parse(
    await promises.readFile(join('.', 'package.json'), 'utf8'),
  )
  const options = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setVersion(pkg.version)
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    })
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, options)
  SwaggerModule.setup(swaggerPath, app, documentFactory, {
    jsonDocumentUrl: 'docs/json',
    customCss: `
      .response-control-media-type,
      .responses-inner h5,
      .opblock-body .highlight-code > .microlight + .response-control-media-type {
        display: none !important;
      }
    `,
  })

  await app.listen(port, '0.0.0.0')
  const appUrl = await app.getUrl()
  logger.log(`API is running on ${appUrl}/${apiPrefix}`)
  logger.log(`Swagger docs on ${appUrl}/${swaggerPath}`)
}
bootstrap()
