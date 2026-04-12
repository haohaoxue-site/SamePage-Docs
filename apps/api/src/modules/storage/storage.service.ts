import type { Readable } from 'node:stream'
import type { StorageConfig } from '../../config/storage.config'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024
const AVATAR_BUCKET = 'avatar'

const AVATAR_MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

type AvatarMimeType = keyof typeof AVATAR_MIME_EXTENSION_MAP

@Injectable()
export class StorageService {
  private readonly config: StorageConfig
  private readonly client: S3Client
  private ensureAvatarBucketPromise: Promise<void> | null = null

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<StorageConfig>('storage')
    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
      credentials: {
        accessKeyId: this.config.accessKey,
        secretAccessKey: this.config.secretKey,
      },
    })
  }

  async uploadAvatar(input: {
    userId: string
    fileName: string
    mimeType: string
    buffer: Buffer
  }): Promise<{ key: string }> {
    const mimeType = assertAvatarMimeType(input.mimeType)
    assertAvatarBuffer(input.buffer, mimeType)
    await this.ensureAvatarBucket()

    const key = `user-avatar/${input.userId}/${Date.now()}-${randomUUID()}.${AVATAR_MIME_EXTENSION_MAP[mimeType]}`

    await this.client.send(new PutObjectCommand({
      Bucket: AVATAR_BUCKET,
      Key: key,
      Body: input.buffer,
      ContentType: mimeType,
      ContentDisposition: buildInlineContentDisposition(input.fileName),
      ContentLength: input.buffer.length,
    }))

    return { key }
  }

  async getAvatarObject(key: string): Promise<{
    body: Readable
    contentType: string
    contentLength: number | null
  }> {
    try {
      const result = await this.client.send(new GetObjectCommand({
        Bucket: AVATAR_BUCKET,
        Key: key,
      }))

      if (!result.Body) {
        throw new NotFoundException('头像文件不存在')
      }

      return {
        body: result.Body as Readable,
        contentType: result.ContentType ?? 'application/octet-stream',
        contentLength: typeof result.ContentLength === 'number' ? result.ContentLength : null,
      }
    }
    catch (error) {
      if (error instanceof NoSuchKey) {
        throw new NotFoundException('头像文件不存在')
      }

      throw error
    }
  }

  async removeAvatar(key: string | null | undefined): Promise<void> {
    if (!key) {
      return
    }

    await this.client.send(new DeleteObjectCommand({
      Bucket: AVATAR_BUCKET,
      Key: key,
    })).catch(() => {})
  }

  private async ensureAvatarBucket(): Promise<void> {
    this.ensureAvatarBucketPromise ??= this.ensureBucket(AVATAR_BUCKET)
    return this.ensureAvatarBucketPromise
  }

  private async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }))
    }
    catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }))
    }
  }
}

function assertAvatarMimeType(mimeType: string): AvatarMimeType {
  const normalizedMimeType = mimeType.trim().toLowerCase()

  if (normalizedMimeType in AVATAR_MIME_EXTENSION_MAP) {
    return normalizedMimeType as AvatarMimeType
  }

  throw new BadRequestException('头像仅支持 JPG、PNG、WEBP 格式')
}

function assertAvatarBuffer(buffer: Buffer, mimeType: AvatarMimeType): void {
  if (!buffer.length) {
    throw new BadRequestException('头像文件不能为空')
  }

  if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
    throw new BadRequestException('头像大小不能超过 2MB')
  }

  if (!isAvatarSignatureMatched(buffer, mimeType)) {
    throw new BadRequestException('头像文件格式不正确')
  }
}

function isAvatarSignatureMatched(buffer: Buffer, mimeType: AvatarMimeType): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
  }

  if (mimeType === 'image/png') {
    return buffer.length >= 8
      && buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4E
      && buffer[3] === 0x47
      && buffer[4] === 0x0D
      && buffer[5] === 0x0A
      && buffer[6] === 0x1A
      && buffer[7] === 0x0A
  }

  return buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
}

function buildInlineContentDisposition(fileName: string): string {
  const fallbackName = fileName.trim() || 'avatar'
  return `inline; filename="${fallbackName.replace(/"/g, '')}"`
}
